import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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

  useEffect(() => {
    if (id) load();
  }, [id]);

  const load = async () => {
    const { data: t } = await supabase.from("workout_templates").select("*").eq("id", id!).single();
    setTemplate(t);

    const { data: exs } = await supabase
      .from("template_exercises")
      .select("*")
      .eq("template_id", id!)
      .order("sort_order");

    if (exs && exs.length > 0) {
      const { data: sets } = await supabase
        .from("planned_sets")
        .select("*")
        .in("exercise_id", exs.map((e) => e.id))
        .order("set_number");

      const mapped: ExerciseWithSets[] = exs.map((e) => ({
        ...e,
        sets: sets?.filter((s) => s.exercise_id === e.id) ?? [],
      }));
      setExercises(mapped);
    } else {
      setExercises([]);
    }
  };

  const addExercise = async () => {
    if (!newExercise.trim() || !id) return;
    const { error } = await supabase.from("template_exercises").insert({
      template_id: id,
      name: newExercise.trim(),
      sort_order: exercises.length,
    });
    if (error) {
      toast.error("Erro ao adicionar exercício.");
      return;
    }
    setNewExercise("");
    load();
  };

  const deleteExercise = async (exId: string) => {
    await supabase.from("template_exercises").delete().eq("id", exId);
    load();
  };

  const addSet = async (exerciseId: string, currentSetsCount: number) => {
    const { error } = await supabase.from("planned_sets").insert({
      exercise_id: exerciseId,
      set_number: currentSetsCount + 1,
      planned_reps: 12,
      planned_weight: 0,
    });
    if (error) {
      toast.error("Erro ao adicionar série.");
      return;
    }
    load();
  };

  const updateSet = async (setId: string, field: "planned_reps" | "planned_weight", value: number) => {
    await supabase.from("planned_sets").update({ [field]: value }).eq("id", setId);
  };

  const deleteSet = async (setId: string) => {
    await supabase.from("planned_sets").delete().eq("id", setId);
    load();
  };

  if (!template) return null;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/trainer/templates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-foreground truncate">{template.name}</h1>
            {template.description && (
              <p className="text-xs text-muted-foreground truncate">{template.description}</p>
            )}
          </div>
        </div>

        {/* Exercise List */}
        {exercises.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum exercício adicionado.</p>
              <p className="text-xs text-muted-foreground mt-1">Use o campo abaixo para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {exercises.map((ex) => (
              <Card key={ex.id}>
                <CardContent className="py-4 space-y-3">
                  {/* Exercise header */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => deleteExercise(ex.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Sets */}
                  {ex.sets.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-[1.5rem_1fr_1fr_1.75rem] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">
                        <span>#</span>
                        <span>Reps</span>
                        <span>Peso (kg)</span>
                        <span />
                      </div>
                      {ex.sets.map((s) => (
                        <div key={s.id} className="grid grid-cols-[1.5rem_1fr_1fr_1.75rem] gap-2 items-center">
                          <span className="text-xs text-muted-foreground text-center">{s.set_number}</span>
                          <Input
                            type="number"
                            defaultValue={s.planned_reps}
                            className="h-9 text-sm"
                            onBlur={(e) => updateSet(s.id, "planned_reps", Number(e.target.value))}
                          />
                          <Input
                            type="number"
                            defaultValue={s.planned_weight}
                            className="h-9 text-sm"
                            onBlur={(e) => updateSet(s.id, "planned_weight", Number(e.target.value))}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteSet(s.id)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {ex.sets.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma série definida.</p>
                  )}

                  {/* Add set button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => addSet(ex.id, ex.sets.length)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar série
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Exercise - full width, sticky bottom feel */}
        <div className="space-y-2 pb-4">
          <Input
            placeholder="Nome do exercício"
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExercise()}
            className="h-10"
          />
          <Button
            className="w-full"
            onClick={addExercise}
            disabled={!newExercise.trim()}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Adicionar exercício
          </Button>
        </div>
      </div>
    </Layout>
  );
}
