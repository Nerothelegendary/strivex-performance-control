import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface StarterTemplate {
  id: string;
  name: string;
  description: string | null;
  goal_type: string;
  difficulty_level: string;
  exercise_count: number;
}

const GOAL_LABELS: Record<string, string> = {
  hypertrophy: "Hipertrofia",
  strength: "Força",
  general: "Geral",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

interface Props {
  onCloned: () => void;
}

export function StarterTemplateLibrary({ onCloned }: Props) {
  const { user } = useAuth();
  const [starters, setStarters] = useState<StarterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [goalFilter, setGoalFilter] = useState<string | null>(null);

  useEffect(() => {
    loadStarters();
  }, []);

  const loadStarters = async () => {
    const { data } = await supabase
      .from("starter_templates")
      .select("id, name, description, goal_type, difficulty_level, exercise_count")
      .eq("is_public", true)
      .order("difficulty_level");
    setStarters((data as StarterTemplate[]) ?? []);
    setLoading(false);
  };

  const cloneStarter = async (starterId: string) => {
    if (!user) return;
    setCloningId(starterId);
    const { error } = await supabase.rpc("clone_starter_template", {
      p_starter_id: starterId,
      p_new_owner_id: user.id,
    });
    setCloningId(null);
    if (error) {
      toast.error("Erro ao clonar modelo.");
      return;
    }
    toast.success("Modelo adicionado aos seus treinos!");
    onCloned();
  };

  const goals = [...new Set(starters.map((s) => s.goal_type))];
  const filtered = goalFilter ? starters.filter((s) => s.goal_type === goalFilter) : starters;

  if (loading) return null;
  if (starters.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Começar a partir de modelo</h3>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setGoalFilter(null)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            !goalFilter
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-card/40 text-muted-foreground border-border hover:bg-secondary"
          }`}
        >
          Todos
        </button>
        {goals.map((g) => (
          <button
            key={g}
            onClick={() => setGoalFilter(goalFilter === g ? null : g)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              goalFilter === g
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-card/40 text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            {GOAL_LABELS[g] ?? g}
          </button>
        ))}
      </div>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-border bg-card/40 p-3 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                {s.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {DIFFICULTY_LABELS[s.difficulty_level] ?? s.difficulty_level}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Dumbbell className="h-3 w-3" />
                  {s.exercise_count} exercícios
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={cloningId === s.id}
                onClick={() => cloneStarter(s.id)}
              >
                {cloningId === s.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Usar"
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
