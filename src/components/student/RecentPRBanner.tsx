import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RecentPR {
  exercise_name: string;
  max_weight: number;
}

interface RecentPRBannerProps {
  userId: string;
}

/**
 * Shows a celebratory banner when the student achieved PRs in their
 * most recent workout session. Queries the last session's sets and
 * compares against get_personal_bests (DB as source of truth).
 */
export function RecentPRBanner({ userId }: RecentPRBannerProps) {
  const [prs, setPrs] = useState<RecentPR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectRecentPRs();
  }, [userId]);

  const detectRecentPRs = async () => {
    // 1. Get last session
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("student_id", userId)
      .order("executed_at", { ascending: false })
      .limit(1);

    if (!sessions || sessions.length === 0) {
      setLoading(false);
      return;
    }

    const lastSessionId = sessions[0].id;

    // 2. Get sets from last session + personal bests in parallel
    const [setsRes, pbRes] = await Promise.all([
      supabase
        .from("session_sets")
        .select("exercise_name, weight")
        .eq("session_id", lastSessionId),
      supabase.rpc("get_personal_bests", { p_student_id: userId }),
    ]);

    if (!setsRes.data || !pbRes.data) {
      setLoading(false);
      return;
    }

    // 3. Build session maxes
    const sessionMaxes = new Map<string, number>();
    setsRes.data.forEach((s) => {
      const cur = sessionMaxes.get(s.exercise_name) ?? 0;
      if (Number(s.weight) > cur) sessionMaxes.set(s.exercise_name, Number(s.weight));
    });

    // 4. Match against DB PRs
    const recentPRs: RecentPR[] = [];
    pbRes.data.forEach((pb) => {
      const sessionMax = sessionMaxes.get(pb.exercise_name);
      if (
        sessionMax !== undefined &&
        sessionMax >= Number(pb.max_weight) &&
        sessionMax > 0
      ) {
        recentPRs.push({
          exercise_name: pb.exercise_name,
          max_weight: Number(pb.max_weight),
        });
      }
    });

    setPrs(recentPRs);
    setLoading(false);
  };

  if (loading || prs.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent p-4 space-y-2.5"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Trophy className="h-5 w-5 text-yellow-400" />
          </motion.div>
          <span className="text-sm font-bold text-foreground">
            {prs.length === 1
              ? "Novo Recorde no último treino!"
              : `${prs.length} Recordes no último treino!`}
          </span>
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: 2, duration: 0.4, delay: 0.5 }}
          >
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
          </motion.div>
        </div>

        <div className="flex flex-wrap gap-2">
          {prs.map((pr, i) => (
            <motion.div
              key={pr.exercise_name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1.5"
            >
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                {pr.exercise_name}
              </span>
              <span className="text-xs font-bold text-yellow-400">
                {pr.max_weight}kg
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
