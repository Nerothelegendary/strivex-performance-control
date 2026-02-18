import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronRight, Trash2, ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BulkAssignDialog } from "@/components/trainer/BulkAssignDialog";
import type { Tables } from "@/integrations/supabase/types";

export default function WorkoutTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Tables<"workout_templates">[]>([]);
  const [students, setStudents] = useState<{ student_id: string; full_name: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) { loadTemplates(); loadStudents(); }
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;
    const { data } = await supabase.from("workout_templates").select("*").eq("trainer_id", user.id).order("created_at", { ascending: false });
    setTemplates(data ?? []);
    setLoading(false);
  };

  const loadStudents = async () => {
    if (!user) return;
    const { data: links } = await supabase.from("trainer_students").select("student_id").eq("trainer_id", user.id);
    if (!links || links.length === 0) { setStudents([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", links.map((l) => l.student_id));
    setStudents(links.map((l) => ({
      student_id: l.student_id,
      full_name: profiles?.find((p) => p.user_id === l.student_id)?.full_name ?? null,
    })));
  };

  const createTemplate = async () => {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from("workout_templates").insert({ trainer_id: user.id, name: name.trim(), description: description.trim() || null });
    if (error) { toast.error("Erro ao criar treino."); return; }
    toast.success("Treino criado!");
    setName(""); setDescription(""); setOpen(false);
    loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("workout_templates").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir."); return; }
    toast.success("Treino excluído.");
    loadTemplates();
  };

  const duplicateTemplate = async (templateId: string) => {
    if (!user) return;
    // 1. Get original template
    const { data: original } = await supabase.from("workout_templates").select("*").eq("id", templateId).single();
    if (!original) return;

    // 2. Create clone
    const { data: cloned, error: cloneErr } = await supabase.from("workout_templates")
      .insert({ trainer_id: user.id, name: `${original.name} (cópia)`, description: original.description })
      .select("id").single();
    if (cloneErr || !cloned) { toast.error("Erro ao duplicar."); return; }

    // 3. Clone exercises
    const { data: exercises } = await supabase.from("template_exercises").select("*").eq("template_id", templateId).order("sort_order");
    if (exercises && exercises.length > 0) {
      const exerciseInserts = exercises.map((e) => ({ template_id: cloned.id, name: e.name, sort_order: e.sort_order }));
      const { data: newExercises } = await supabase.from("template_exercises").insert(exerciseInserts).select("id, sort_order");

      // 4. Clone planned sets
      if (newExercises) {
        const { data: sets } = await supabase.from("planned_sets").select("*").in("exercise_id", exercises.map((e) => e.id));
        if (sets && sets.length > 0) {
          // Map old exercise_id -> new exercise_id by sort_order
          const oldToNew = new Map<string, string>();
          exercises.forEach((oldEx) => {
            const newEx = newExercises.find((ne) => ne.sort_order === oldEx.sort_order);
            if (newEx) oldToNew.set(oldEx.id, newEx.id);
          });

          const setInserts = sets.map((s) => ({
            exercise_id: oldToNew.get(s.exercise_id)!,
            set_number: s.set_number,
            planned_reps: s.planned_reps,
            planned_weight: s.planned_weight,
          })).filter((s) => s.exercise_id);

          if (setInserts.length > 0) {
            await supabase.from("planned_sets").insert(setInserts);
          }
        }
      }
    }

    toast.success("Treino duplicado!");
    loadTemplates();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/trainer")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Modelos de Treino</h2>
              <p className="text-sm text-muted-foreground">{templates.length} modelo(s)</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-popover text-popover-foreground">
              <DialogHeader><DialogTitle>Novo Modelo de Treino</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome do treino" value={name} onChange={(e) => setName(e.target.value)} />
                <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                <Button onClick={createTemplate} disabled={!name.trim()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/20 py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhum modelo criado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card/40 hover:bg-card/70 transition-all">
                <div className="py-3 px-4 flex items-center justify-between">
                  <div className="flex-1 cursor-pointer min-w-0" onClick={() => navigate(`/trainer/template/${t.id}`)}>
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <BulkAssignDialog templateId={t.id} templateName={t.name} students={students} onDone={loadTemplates} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => duplicateTemplate(t.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                      title="Excluir treino"
                      description="Tem certeza que deseja excluir este modelo de treino? Esta ação não pode ser desfeita."
                      confirmLabel="Excluir"
                      onConfirm={() => deleteTemplate(t.id)}
                    />
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
