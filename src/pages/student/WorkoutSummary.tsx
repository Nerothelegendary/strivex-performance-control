import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, TrendingDown, Minus, Dumbbell, Home, Loader2 } from "lucide-react";
import { motion, type Variants } from "framer-motion";

interface SummarySet {
  exercise_name: string;
  reps: number;
  weight: number;
}

interface PREntry {
  exercise_name: string;
  weight: number;
}

export interface WorkoutSummaryState {
  sessionId: string;
  templateId: string;
  templateName: string;
  studentId: string;
  sets: SummarySet[];
}

interface ExerciseVolume {
  exercise_name: string;
  volume: number;
}

export default function WorkoutSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as WorkoutSummaryState | null;

  const [prevVolume, setPrevVolume] = useState<number | null>(null);
  const [newPRs, setNewPRs] = useState<PREntry[]>([]);
  const [exerciseBreakdown, setExerciseBreakdown] = useState<ExerciseVolume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state) { navigate("/student", { replace: true }); return; }
    loadComparison();
  }, []);

  const loadComparison = async () => {
    if (!state) return;

    // 1. Previous session of same template (excluding current session)
    const { data: prevSessions } = await supabase
      .from("workout_sessions")
      .select("id, total_volume")
      .eq("student_id", state.studentId)
      .eq("template_id", state.templateId)
      .neq("id", state.sessionId)
      .order("executed_at", { ascending: false })
      .limit(1);

    if (prevSessions && prevSessions.length > 0) {
      setPrevVolume(Number(prevSessions[0].total_volume));
    }

    // 2. PR detection — compare current session max weights vs all previous session weights
    const { data: allPrevSets } = await supabase
      .from("session_sets")
      .select("exercise_name, weight")
      .in(
        "session_id",
        (prevSessions ?? []).length > 0
          ? (
              await supabase
                .from("workout_sessions")
                .select("id")
                .eq("student_id", state.studentId)
                .neq("id", state.sessionId)
            ).data?.map((s) => s.id) ?? []
          : ["__none__"]
      );

    const previousMaxes = new Map<string, number>();
    allPrevSets?.forEach((s) => {
      const cur = previousMaxes.get(s.exercise_name) ?? 0;
      if (Number(s.weight) > cur) previousMaxes.set(s.exercise_name, Number(s.weight));
    });

    const currentMaxes = new Map<string, number>();
    state.sets.forEach((s) => {
      const cur = currentMaxes.get(s.exercise_name) ?? 0;
      if (s.weight > cur) currentMaxes.set(s.exercise_name, s.weight);
    });

    const prs: PREntry[] = [];
    currentMaxes.forEach((weight, name) => {
      const prev = previousMaxes.get(name) ?? 0;
      if (weight > prev && weight > 0) prs.push({ exercise_name: name, weight });
    });
    setNewPRs(prs);

    // 3. Per-exercise volume breakdown for current session
    const volMap = new Map<string, number>();
    state.sets.forEach((s) => {
      volMap.set(s.exercise_name, (volMap.get(s.exercise_name) ?? 0) + s.reps * s.weight);
    });
    const breakdown: ExerciseVolume[] = [];
    volMap.forEach((volume, exercise_name) => breakdown.push({ exercise_name, volume }));
    setExerciseBreakdown(breakdown.sort((a, b) => b.volume - a.volume));

    setLoading(false);
  };

  if (!state) return null;

  const totalVolume = state.sets.reduce((acc, s) => acc + s.reps * s.weight, 0);
  const volumeDiff = prevVolume !== null ? totalVolume - prevVolume : null;
  const volumePct = prevVolume && prevVolume > 0 ? Math.round((volumeDiff! / prevVolume) * 100) : null;

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  return (
    <Layout>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div
          className="space-y-5 pb-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Header */}
          <motion.div variants={item} className="text-center pt-4 pb-2">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-2 ring-primary/30">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Treino Concluído!</h2>
            <p className="text-sm text-muted-foreground mt-1">{state.templateName}</p>
          </motion.div>

          {/* PRs */}
          {newPRs.length > 0 && (
            <motion.div
              variants={item}
              className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2"
            >
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-semibold text-foreground">
                  {newPRs.length === 1 ? "Novo Recorde Pessoal!" : `${newPRs.length} Novos Recordes!`}
                </span>
              </div>
              {newPRs.map((pr) => (
                <div
                  key={pr.exercise_name}
                  className="flex items-center justify-between rounded-lg bg-yellow-500/10 px-3 py-2"
                >
                  <span className="text-sm font-medium text-foreground truncate pr-2">
                    {pr.exercise_name}
                  </span>
                  <span className="text-sm font-bold text-yellow-400 shrink-0">
                    {pr.weight} kg
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Volume stats */}
          <motion.div variants={item} className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <p className="text-xs text-muted-foreground mb-1">Volume Total</p>
              <p className="text-2xl font-bold text-foreground">
                {totalVolume.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4">
              <p className="text-xs text-muted-foreground mb-1">vs. Sessão Anterior</p>
              {volumeDiff === null ? (
                <p className="text-sm text-muted-foreground mt-1">Primeira sessão</p>
              ) : (
                <div className="flex items-center gap-1.5 mt-1">
                  {volumeDiff > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-400 shrink-0" />
                  ) : volumeDiff < 0 ? (
                    <TrendingDown className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={`text-lg font-bold ${
                      volumeDiff > 0
                        ? "text-green-400"
                        : volumeDiff < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {volumeDiff > 0 ? "+" : ""}
                    {volumePct !== null ? `${volumePct}%` : "0%"}
                  </span>
                </div>
              )}
              {prevVolume !== null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  anterior: {prevVolume.toLocaleString()} kg
                </p>
              )}
            </div>
          </motion.div>

          {/* Exercise breakdown */}
          {exerciseBreakdown.length > 0 && (
            <motion.div variants={item} className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Volume por Exercício
              </h4>
              {exerciseBreakdown.map((ex, i) => {
                const maxVol = exerciseBreakdown[0].volume;
                const pct = maxVol > 0 ? (ex.volume / maxVol) * 100 : 0;
                return (
                  <div key={ex.exercise_name} className="rounded-lg border border-border bg-card/30 px-3 py-2.5">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-foreground truncate pr-2">{ex.exercise_name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {ex.volume.toLocaleString()} kg
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Sets summary */}
          <motion.div variants={item} className="rounded-xl border border-border bg-card/30 p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Resumo das Séries
            </h4>
            <div className="space-y-1.5">
              {state.sets.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate pr-4">{s.exercise_name}</span>
                  <span className="text-foreground shrink-0">
                    {s.reps}× {s.weight} kg
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div variants={item}>
            <Button
              onClick={() => navigate("/student")}
              className="w-full h-12 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
          </motion.div>
        </motion.div>
      )}
    </Layout>
  );
}
