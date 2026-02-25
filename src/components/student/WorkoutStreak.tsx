import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";

interface WorkoutStreakProps {
  userId: string;
}

/**
 * Calculates consecutive weeks with at least one workout session.
 * A "streak" = unbroken chain of calendar weeks (Mon-Sun) with ≥1 session.
 */
export function WorkoutStreak({ userId }: WorkoutStreakProps) {
  const [streak, setStreak] = useState(0);
  const [thisWeekDone, setThisWeekDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak();
  }, [userId]);

  const loadStreak = async () => {
    // Use get_weekly_volume RPC — returns week_start + session_count for last 12 weeks
    const { data, error } = await supabase.rpc("get_weekly_volume", {
      p_student_id: userId,
    });

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Build a set of week-start ISO dates that had sessions
    const activeWeeks = new Set(
      data.filter((w) => Number(w.session_count) > 0).map((w) => w.week_start)
    );

    // Walk backwards from current week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - mondayOffset);
    currentMonday.setHours(0, 0, 0, 0);

    // Check if current week has a session
    const currentWeekStr = currentMonday.toISOString().slice(0, 10);
    const currentWeekActive = activeWeeks.has(currentWeekStr);
    setThisWeekDone(currentWeekActive);

    // Count streak going backwards
    let count = 0;
    const checkDate = new Date(currentMonday);

    // If current week is active, include it; otherwise start from last week
    if (!currentWeekActive) {
      checkDate.setDate(checkDate.getDate() - 7);
    }

    for (let i = 0; i < 12; i++) {
      const weekStr = checkDate.toISOString().slice(0, 10);
      if (activeWeeks.has(weekStr)) {
        count++;
        checkDate.setDate(checkDate.getDate() - 7);
      } else {
        break;
      }
    }

    setStreak(count);
    setLoading(false);
  };

  if (loading || streak === 0) return null;

  const flameColor =
    streak >= 8
      ? "text-red-400"
      : streak >= 4
      ? "text-orange-400"
      : "text-yellow-400";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-xl border border-border bg-card/40 p-4 flex items-center gap-4"
    >
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <Flame className={`h-8 w-8 ${flameColor}`} />
        </motion.div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-foreground">{streak}</span>
          <span className="text-sm text-muted-foreground">
            semana{streak !== 1 ? "s" : ""} seguida{streak !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {thisWeekDone
            ? "✓ Treino desta semana concluído!"
            : "Treine esta semana para manter a sequência!"}
        </p>
      </div>

      {/* Mini week dots — last 4 weeks */}
      <div className="flex gap-1 shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full ${
              i < streak ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
