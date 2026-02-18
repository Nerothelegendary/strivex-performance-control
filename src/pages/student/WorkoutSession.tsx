import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface ExerciseWithSets {
  id: string;
  name: string;
  sets: { set_number: number; planned_reps: number; planned_weight: number; actual_reps: number; actual_weight: number; }[];
}

export default function WorkoutSession() {
  const { templateId } = useParams<{ templateId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Tables<"workout_templates"> | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [sessionNote, setSessionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (templateId) load();
  }, [templateId]);

  const load = async () => {
    const { data: t } = await supabase.from("workout_templates").select("*").eq("id", templateId!).single();
    setTemplate(t);
    const { data: exs } = await supabase.from("template_exercises").select("*").eq("template_id", templateId!).order("sort_order");
    if (exs && exs.length > 0) {
      const { data: sets } = await supabase.from("planned_sets").select("*").in("exercise_id", exs.map((e) => e.id)).order("set_number");
      const mapped: ExerciseWithSets[] = exs.map((e) => ({
        id: e.id, name: e.name,
        sets: (sets?.filter((s) => s.exercise_id === e.id) ?? []).map((s) => ({
          set_number: s.set_number, planned_reps: s.planned_reps, planned_weight: Number(s.planned_weight),
          actual_reps: s.planned_reps, actual_weight: Number(s.planned_weight),
        })),
      }));
      setExercises(mapped);
    }
    setLoading(false);
  };

  const updateSet = (exIdx: number, setIdx: number, field: "actual_reps" | "actual_weight", value: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exIdx] = { ...updated[exIdx], sets: updated[exIdx].sets.map((s, i) => (i === setIdx ? { ...s, [field]: value } : s)) };
      return updated;
    });
  };

  const saveSession = async () => {
    if (!user || !template) return;
    setSaving(true);
    let totalVolume = 0;
    const allSets: { exercise_name: string; set_number: number; reps: number; weight: number }[] = [];
    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        totalVolume += s.actual_reps * s.actual_weight;
        allSets.push({ exercise_name: ex.name, set_number: s.set_number, reps: s.actual_reps, weight: s.actual_weight });
      });
    });

    const { data: session, error: sessionErr } = await supabase
      .from("workout_sessions")
      .insert({ student_id: user.id, template_id: template.id, template_name: template.name, total_volume: totalVolume, exercise_count: exercises.length, notes: sessionNote.trim() || null })
      .select("id").single();

    if (sessionErr || !session) { toast.error("Erro ao salvar sessão."); setSaving(false); return; }

    if (allSets.length > 0) {
      const { error: setsErr } = await supabase.from("session_sets").insert(allSets.map((s) => ({ ...s, session_id: session.id })));
      if (setsErr) { toast.error("Erro ao salvar séries."); setSaving(false); return; }
    }

    toast.success("Treino salvo com sucesso!");
    navigate("/");
  };

  if (loading) return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div></Layout>;
  if (!template) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-white">{template.name}</h2>
            <p className="text-sm text-white/40">Registre sua execução</p>
          </div>
        </div>

        {exercises.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-8 text-center">
            <p className="text-sm text-white/40">Nenhum exercício definido neste treino.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exercises.map((ex, exIdx) => (
              <div key={ex.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white mb-3">{ex.name}</p>
                {ex.sets.length === 0 ? (
                  <p className="text-xs text-white/30">Nenhuma série.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-xs text-white/30">
                      <span>#</span><span>Reps</span><span>Peso (kg)</span>
                    </div>
                    {ex.sets.map((s, setIdx) => (
                      <div key={setIdx} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center">
                        <span className="text-xs text-white/30">{s.set_number}</span>
                        <Input type="number" value={s.actual_reps} className="h-8 text-sm border-white/10 bg-white/5 text-white"
                          onChange={(e) => updateSet(exIdx, setIdx, "actual_reps", Number(e.target.value))} />
                        <Input type="number" value={s.actual_weight} className="h-8 text-sm border-white/10 bg-white/5 text-white"
                          onChange={(e) => updateSet(exIdx, setIdx, "actual_weight", Number(e.target.value))} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Textarea placeholder="Observações sobre o treino (opcional)" value={sessionNote} onChange={(e) => setSessionNote(e.target.value)} rows={3}
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />

            <Button onClick={saveSession} disabled={saving} className="w-full h-12 text-base font-semibold"
              style={{ background: 'linear-gradient(135deg, hsl(224 76% 33%), hsl(217 91% 60%))' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar Treino
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
