import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronRight, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

export default function WorkoutTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Tables<"workout_templates">[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false });
    setTemplates(data ?? []);
    setLoading(false);
  };

  const createTemplate = async () => {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from("workout_templates").insert({
      trainer_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
    });
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/trainer")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-white">Modelos de Treino</h2>
              <p className="text-sm text-white/40">{templates.length} modelo(s)</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" style={{ background: 'linear-gradient(135deg, hsl(224 76% 33%), hsl(217 91% 60%))' }}>
                <Plus className="h-4 w-4 mr-1" /> Novo Treino
              </Button>
            </DialogTrigger>
            <DialogContent className="border-white/10 bg-[hsl(222,47%,11%)] text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Novo Modelo de Treino</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome do treino" value={name} onChange={(e) => setName(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
                <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
                <Button onClick={createTemplate} disabled={!name.trim()} className="w-full"
                  style={{ background: 'linear-gradient(135deg, hsl(224 76% 33%), hsl(217 91% 60%))' }}>
                  Criar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-sm text-white/40">Carregando...</p>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
            <p className="text-sm text-white/40">Nenhum modelo criado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-all">
                <div className="py-3 px-4 flex items-center justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/trainer/template/${t.id}`)}>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    {t.description && <p className="text-xs text-white/40">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/30 hover:text-red-400 hover:bg-white/10" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-white/20" />
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
