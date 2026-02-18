import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Play, ClipboardList, Loader2 } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Tables<"workout_templates">[]>([]);
  const [recentSessions, setRecentSessions] = useState<Tables<"workout_sessions">[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasTrainer, setHasTrainer] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    const { data: trainerLink } = await supabase.from("trainer_students").select("id").eq("student_id", user.id).limit(1).maybeSingle();
    if (!trainerLink) { setHasTrainer(false); setLoading(false); return; }
    setHasTrainer(true);

    const { data: assigned } = await supabase.from("student_templates").select("template_id").eq("student_id", user.id);
    if (assigned && assigned.length > 0) {
      const { data: tmpl } = await supabase.from("workout_templates").select("*").in("id", assigned.map((a) => a.template_id));
      setTemplates(tmpl ?? []);
    }

    const { data: sessions } = await supabase.from("workout_sessions").select("*").eq("student_id", user.id).order("executed_at", { ascending: false }).limit(10);
    setRecentSessions(sessions ?? []);
    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (hasTrainer === false) return <Navigate to="/student/invite" replace />;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Meus Treinos</h2>
          <p className="text-sm text-muted-foreground">Escolha um treino para iniciar</p>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/20 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <ClipboardList className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground/70">Seu treinador ainda não enviou seu treino.</p>
            <p className="text-sm text-muted-foreground mt-1.5">Assim que ele criar sua rotina, ela aparecerá aqui.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card/40 hover:bg-card/70 transition-all p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </div>
                <Button size="sm" onClick={() => navigate(`/student/session/${t.id}`)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Play className="h-4 w-4 mr-1" /> Iniciar
                </Button>
              </div>
            ))}
          </div>
        )}

        {recentSessions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Últimas Sessões</h3>
            {recentSessions.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card/40 p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.template_name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(s.executed_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{Number(s.total_volume).toLocaleString()} kg</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
