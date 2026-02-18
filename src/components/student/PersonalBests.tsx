import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

interface PersonalBest {
  exercise_name: string;
  max_weight: number;
  max_volume: number; // best single-set volume (reps * weight)
}

interface PersonalBestsProps {
  userId: string;
}

export function PersonalBests({ userId }: PersonalBestsProps) {
  const [bests, setBests] = useState<PersonalBest[]>([]);

  useEffect(() => {
    loadBests();
  }, [userId]);

  const loadBests = async () => {
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("student_id", userId);

    if (!sessions || sessions.length === 0) return;

    const { data: sets } = await supabase
      .from("session_sets")
      .select("exercise_name, reps, weight")
      .in("session_id", sessions.map((s) => s.id));

    if (!sets) return;

    // Calculate PBs per exercise
    const pbMap = new Map<string, PersonalBest>();
    sets.forEach((s) => {
      const existing = pbMap.get(s.exercise_name);
      const volume = s.reps * Number(s.weight);
      const weight = Number(s.weight);

      if (!existing) {
        pbMap.set(s.exercise_name, {
          exercise_name: s.exercise_name,
          max_weight: weight,
          max_volume: volume,
        });
      } else {
        if (weight > existing.max_weight) existing.max_weight = weight;
        if (volume > existing.max_volume) existing.max_volume = volume;
      }
    });

    setBests(Array.from(pbMap.values()).sort((a, b) => b.max_weight - a.max_weight));
  };

  if (bests.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h3 className="text-sm font-semibold text-foreground">Recordes Pessoais</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {bests.slice(0, 8).map((pb) => (
          <div key={pb.exercise_name} className="rounded-lg border border-border bg-card/40 p-3">
            <p className="text-xs font-medium text-foreground truncate">{pb.exercise_name}</p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-lg font-bold text-foreground">{pb.max_weight}<span className="text-xs text-muted-foreground ml-0.5">kg</span></span>
              <span className="text-xs text-muted-foreground">{pb.max_volume.toLocaleString()} kg vol.</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
