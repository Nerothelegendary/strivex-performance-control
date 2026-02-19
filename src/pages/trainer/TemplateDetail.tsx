import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowLeft, GripVertical, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExerciseCombobox } from "@/components/trainer/ExerciseCombobox";
import type { Tables } from "@/integrations/supabase/types";

interface ExerciseWithSets extends Tables<"template_exercises"> {
  sets: Tables<"planned_sets">[];
}

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Tables<"workout_templates"> | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [newExercise, setNewExercise] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) load();
  }, [id]);

  const load = async () => {
    const { data: t } = await supabase.from("workout_templates").select("*").eq("id", id!).single();
    setTemplate(t);
    const { data: exs } = await supabase.from("template_exercises").select("*").eq("template_id", id!).order("sort_order");
    if (exs && exs.length > 0) {
      const { data: sets } = await supabase.from("planned_sets").select("*").in("exercise_id", exs.map((e) => e.id)).order("set_number");
      const mapped: ExerciseWithSets[] = exs.map((e) => ({ ...e, sets: sets?.filter((s) => s.exercise_id === e.id) ?? [] }));
      setExercises(mapped);
    } else {
      setExercises([]);
    }
  };

  const addExercise = async (name?: string) => {
    const exerciseName = (name || newExercise).trim();
    if (!exerciseName || !id || !user) return;
    const { error } = await supabase.from("template_exercises").insert({ template_id: id, name: exerciseName, sort_order: exercises.length });
    if (error) { toast.error("Erro ao adicionar exercício."); return; }
    await supabase.from("exercise_library").upsert(
      { trainer_id: user.id, name: exerciseName },
      { onConflict: "trainer_id,name" }
    );
    setNewExercise("");
    load();
  };

  const deleteExercise = async (exId: string) => {
    await supabase.from("template_exercises").delete().eq("id", exId);
    load();
  };

  const addSet = async (exerciseId: string, currentSetsCount: number) => {
    const { error } = await supabase.from("planned_sets").insert({ exercise_id: exerciseId, set_number: currentSetsCount + 1, planned_reps: 12, planned_weight: 0 });
    if (error) { toast.error("Erro ao adicionar série."); return; }
    load();
  };

  const updateSet = async (setId: string, field: "planned_reps" | "planned_weight", value: number) => {
    await supabase.from("planned_sets").update({ [field]: value }).eq("id", setId);
  };

  const deleteSet = async (setId: string) => {
    await supabase.from("planned_sets").delete().eq("id", setId);
    load();
  };

  const saveTemplateName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || !template || trimmed === template.name) {
      setEditingName(false);
      return;
    }
    await supabase.from("workout_templates").update({ name: trimmed }).eq("id", template.id);
    setTemplate({ ...template, name: trimmed });
    setEditingName(false);
    toast.success("Nome atualizado.");
  };

  const saveTemplateDesc = async () => {
    if (!template) { setEditingDesc(false); return; }
    const trimmed = editDesc.trim();
    const newDesc = trimmed || null;
    if (newDesc === (template.description || null)) {
      setEditingDesc(false);
      return;
    }
    await supabase.from("workout_templates").update({ description: newDesc }).eq("id", template.id);
    setTemplate({ ...template, description: newDesc });
    setEditingDesc(false);
    toast.success("Descrição atualizada.");
  };

  const startEditingName = () => {
    setEditName(template?.name || "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  if (!template) return (
    <Layout>
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Carregando treino...</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/trainer/templates")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={nameInputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={saveTemplateName}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTemplateName(); if (e.key === "Escape") setEditingName(false); }}
                  className="flex-1 min-w-0 text-base font-bold tracking-tight text-foreground uppercase bg-transparent border-b border-accent/50 outline-none py-0.5"
                />
                <button onClick={saveTemplateName} className="p-1 text-accent hover:text-accent/80">
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditingName}
                className="group flex items-center gap-1.5 min-w-0 w-full text-left"
              >
                <h1 className="text-base font-bold tracking-tight text-foreground truncate uppercase">
                  {template.name}
                </h1>
                <Pencil className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 transition-colors" />
              </button>
            )}
            {editingDesc ? (
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onBlur={saveTemplateDesc}
                onKeyDown={(e) => { if (e.key === "Enter") saveTemplateDesc(); if (e.key === "Escape") setEditingDesc(false); }}
                placeholder="Descrição (opcional)"
                className="w-full text-[11px] text-muted-foreground bg-transparent border-b border-accent/30 outline-none py-0.5 mt-0.5 placeholder:text-muted-foreground/30"
                autoFocus
              />
            ) : (
              <button
                onClick={() => { setEditDesc(template.description || ""); setEditingDesc(true); }}
                className="group flex items-center gap-1 text-left w-full mt-0.5"
              >
                <p className="text-[11px] text-muted-foreground truncate">
                  {template.description || "Adicionar descrição..."}
                </p>
                <Pencil className="h-2.5 w-2.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0 transition-colors" />
              </button>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums font-medium shrink-0">
            {exercises.length} exerc.
          </span>
        </div>

        {/* Exercises */}
        {exercises.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/50 bg-card/10 py-8 text-center">
            <p className="text-xs text-muted-foreground">Nenhum exercício adicionado.</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Use o campo abaixo para começar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((ex, exIndex) => (
              <div
                key={ex.id}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm overflow-hidden"
              >
                {/* Exercise Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wide truncate">
                      {ex.name}
                    </span>
                  </div>
                  <ConfirmDialog
                    trigger={
                      <button className="p-1 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    }
                    title="Excluir exercício"
                    description="Tem certeza que deseja excluir este exercício e todas as suas séries?"
                    confirmLabel="Excluir"
                    onConfirm={() => deleteExercise(ex.id)}
                  />
                </div>

                {/* Sets Table */}
                {ex.sets.length > 0 && (
                  <div className="px-3 py-1.5">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1.2rem_1fr_1fr_1.5rem] gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold mb-1 px-0.5">
                      <span className="text-center">#</span>
                      <span>Reps</span>
                      <span>Peso <span className="text-muted-foreground/30 normal-case">(kg)</span></span>
                      <span />
                    </div>
                    {/* Set Rows */}
                    {ex.sets.map((s) => (
                      <div
                        key={s.id}
                        className="grid grid-cols-[1.2rem_1fr_1fr_1.5rem] gap-1.5 items-center group py-0.5 rounded hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="text-[11px] text-muted-foreground/50 text-center tabular-nums font-medium">
                          {s.set_number}
                        </span>
                        <input
                          type="number"
                          defaultValue={s.planned_reps}
                          className="h-7 w-full rounded border border-white/[0.06] bg-white/[0.03] px-2 text-xs text-foreground tabular-nums font-medium focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-accent/20 transition-all"
                          onBlur={(e) => updateSet(s.id, "planned_reps", Number(e.target.value))}
                        />
                        <input
                          type="number"
                          defaultValue={s.planned_weight}
                          className="h-7 w-full rounded border border-white/[0.06] bg-white/[0.03] px-2 text-xs text-foreground tabular-nums font-medium focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-accent/20 transition-all"
                          onBlur={(e) => updateSet(s.id, "planned_weight", Number(e.target.value))}
                        />
                        <ConfirmDialog
                          trigger={
                            <button className="p-0.5 rounded text-transparent group-hover:text-muted-foreground/40 hover:!text-destructive transition-colors">
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          }
                          title="Excluir série"
                          description="Tem certeza que deseja excluir esta série?"
                          confirmLabel="Excluir"
                          onConfirm={() => deleteSet(s.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {ex.sets.length === 0 && (
                  <p className="px-3 py-2 text-[10px] text-muted-foreground/40">Nenhuma série.</p>
                )}

                {/* Add Set - minimal */}
                <button
                  onClick={() => addSet(ex.id, ex.sets.length)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-muted-foreground/50 hover:text-accent hover:bg-white/[0.02] transition-colors border-t border-white/[0.04]"
                >
                  <Plus className="h-2.5 w-2.5" />
                  <span>Série</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Sticky Add Exercise Bar */}
        <div className="sticky bottom-0 pt-2 pb-4 -mx-1 px-1 bg-gradient-to-t from-background via-background to-transparent">
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] backdrop-blur-md p-2.5 space-y-2">
            <ExerciseCombobox
              value={newExercise}
              onChange={setNewExercise}
              onSelect={(name) => addExercise(name)}
              className="h-9 bg-transparent border-white/[0.06] text-sm placeholder:text-muted-foreground/40 focus-visible:ring-accent/30"
            />
            <Button
              className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => addExercise()}
              disabled={!newExercise.trim()}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar exercício
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
