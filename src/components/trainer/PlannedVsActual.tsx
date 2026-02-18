import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface PlannedVsActualProps {
  session: Tables<"workout_sessions">;
  sessionSets: Tables<"session_sets">[];
}

interface ComparisonRow {
  exerciseName: string;
  setNumber: number;
  plannedReps: number | null;
  plannedWeight: number | null;
  actualReps: number;
  actualWeight: number;
}

export function PlannedVsActual({ session, sessionSets }: PlannedVsActualProps) {
  const [comparisons, setComparisons] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlanned();
  }, [session.id]);

  const loadPlanned = async () => {
    if (!session.template_id) {
      // No template linked — just show actuals
      setComparisons(sessionSets.map((s) => ({
        exerciseName: s.exercise_name,
        setNumber: s.set_number,
        plannedReps: null,
        plannedWeight: null,
        actualReps: s.reps,
        actualWeight: Number(s.weight),
      })));
      setLoading(false);
      return;
    }

    // Fetch exercises and planned sets for the template
    const { data: exercises } = await supabase
      .from("template_exercises")
      .select("id, name")
      .eq("template_id", session.template_id);

    if (!exercises || exercises.length === 0) {
      setComparisons(sessionSets.map((s) => ({
        exerciseName: s.exercise_name,
        setNumber: s.set_number,
        plannedReps: null,
        plannedWeight: null,
        actualReps: s.reps,
        actualWeight: Number(s.weight),
      })));
      setLoading(false);
      return;
    }

    const { data: plannedSets } = await supabase
      .from("planned_sets")
      .select("*, template_exercises!inner(name)")
      .in("exercise_id", exercises.map((e) => e.id))
      .order("set_number");

    // Build lookup: exerciseName+setNumber -> planned
    const plannedMap = new Map<string, { reps: number; weight: number }>();
    plannedSets?.forEach((ps: any) => {
      const key = `${ps.template_exercises.name}-${ps.set_number}`;
      plannedMap.set(key, { reps: ps.planned_reps, weight: Number(ps.planned_weight) });
    });

    const rows: ComparisonRow[] = sessionSets.map((s) => {
      const key = `${s.exercise_name}-${s.set_number}`;
      const planned = plannedMap.get(key);
      return {
        exerciseName: s.exercise_name,
        setNumber: s.set_number,
        plannedReps: planned?.reps ?? null,
        plannedWeight: planned?.weight ?? null,
        actualReps: s.reps,
        actualWeight: Number(s.weight),
      };
    });

    setComparisons(rows);
    setLoading(false);
  };

  if (loading) return null;
  if (comparisons.length === 0) return null;

  const getColor = (planned: number | null, actual: number) => {
    if (planned === null) return "text-foreground/70";
    if (actual > planned) return "text-emerald-400";
    if (actual === planned) return "text-foreground/70";
    return "text-red-400";
  };

  // Group by exercise
  const grouped = new Map<string, ComparisonRow[]>();
  comparisons.forEach((r) => {
    const existing = grouped.get(r.exerciseName) ?? [];
    existing.push(r);
    grouped.set(r.exerciseName, existing);
  });

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([name, rows]) => (
        <div key={name} className="space-y-1">
          <p className="text-xs font-medium text-foreground/80">{name}</p>
          <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1fr] gap-1 text-[10px] text-muted-foreground uppercase tracking-wider px-0.5">
            <span>#</span>
            <span>Plan. Reps</span>
            <span>Real Reps</span>
            <span>Plan. Peso</span>
            <span>Real Peso</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1fr] gap-1 text-xs items-center">
              <span className="text-muted-foreground">{r.setNumber}</span>
              <span className="text-muted-foreground">{r.plannedReps ?? "—"}</span>
              <span className={getColor(r.plannedReps, r.actualReps)}>{r.actualReps}</span>
              <span className="text-muted-foreground">{r.plannedWeight ?? "—"}</span>
              <span className={getColor(r.plannedWeight, r.actualWeight)}>{r.actualWeight}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 pt-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Superou</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Abaixo</span>
      </div>
    </div>
  );
}
