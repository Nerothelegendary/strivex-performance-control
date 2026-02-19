import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, Loader2, TrendingUp, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

const PAGE_SIZE = 15;

export default function StudentHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Tables<"workout_sessions">[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (user) loadSessions(1);
  }, [user]);

  const loadSessions = async (pageNum: number) => {
    if (!user) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE; // fetch one extra to detect hasMore

    const { data } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("student_id", user.id)
      .order("executed_at", { ascending: false })
      .range(from, to);

    const rows = data ?? [];
    const hasMoreRows = rows.length > PAGE_SIZE;
    const slice = rows.slice(0, PAGE_SIZE);

    if (pageNum === 1) {
      setSessions(slice);
    } else {
      setSessions((prev) => [...prev, ...slice]);
    }

    setHasMore(hasMoreRows);
    setPage(pageNum);
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => loadSessions(page + 1);

  // Group sessions by month
  const grouped = sessions.reduce<Record<string, Tables<"workout_sessions">[]>>((acc, s) => {
    const key = format(new Date(s.executed_at), "MMMM yyyy", { locale: ptBR });
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const totalVolume = sessions.reduce((sum, s) => sum + Number(s.total_volume), 0);

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/student")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Histórico</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Todas as suas sessões de treino</p>
          </div>
        </div>

        {/* Summary stats */}
        {!loading && sessions.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-card/40 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sessões registradas</p>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {totalVolume >= 1000
                  ? `${(totalVolume / 1000).toFixed(1)}t`
                  : `${totalVolume.toLocaleString()} kg`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Volume total</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/20 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <Dumbbell className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground/70">Nenhuma sessão registrada ainda.</p>
            <p className="text-sm text-muted-foreground mt-1.5">
              Complete seu primeiro treino para ver o histórico aqui.
            </p>
            <Button
              size="sm"
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate("/student")}
            >
              Ver treinos
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([month, monthSessions]) => (
              <div key={month} className="space-y-2">
                {/* Month header */}
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">
                    {month}
                  </h3>
                  <span className="text-xs text-muted-foreground/50">
                    ({monthSessions.length} sessão{monthSessions.length !== 1 ? "ões" : ""})
                  </span>
                </div>

                {/* Session cards */}
                <div className="relative pl-4">
                  {/* Timeline line */}
                  <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border/50" />

                  <div className="space-y-2">
                    {monthSessions.map((session) => (
                      <div key={session.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[13px] top-3.5 h-2.5 w-2.5 rounded-full border-2 border-border bg-card" />

                        {/* Card */}
                        <div className="rounded-xl border border-border bg-card/40 hover:bg-card/60 transition-colors p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {session.template_name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(session.executed_at), "EEEE, dd 'de' MMMM · HH:mm", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="h-3 w-3" />
                                <span className="font-medium text-foreground">
                                  {Number(session.total_volume).toLocaleString()} kg
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {session.exercise_count} exercício{session.exercise_count !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          {session.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-2 border-t border-border/40 pt-2 italic">
                              "{session.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground gap-1.5"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {loadingMore ? "Carregando..." : "Carregar mais"}
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
