import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

interface PersonalBest {
  exercise_name: string;
  max_weight: number;
  max_volume: number;
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
    // Use server-side aggregation function instead of pulling raw session_sets
    const { data, error } = await supabase.rpc("get_personal_bests", {
      p_student_id: userId,
    });

    if (error) {
      console.warn("PersonalBests RPC error:", error.message);
      return;
    }

    setBests(
      (data ?? []).map((row) => ({
        exercise_name: row.exercise_name,
        max_weight: Number(row.max_weight),
        max_volume: Number(row.max_volume),
      }))
    );
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
              <span className="text-lg font-bold text-foreground">
                {pb.max_weight}
                <span className="text-xs text-muted-foreground ml-0.5">kg</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {pb.max_volume.toLocaleString()} kg vol.
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
