import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Play, ClipboardList, Loader2 } from "lucide-react";
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

    // Check if student is linked to a trainer
    const { data: trainerLink } = await supabase
      .from("trainer_students")
      .select("id")
      .eq("student_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!trainerLink) {
      setHasTrainer(false);
      setLoading(false);
      return;
    }
    setHasTrainer(true);

    const { data: assigned } = await supabase
      .from("student_templates")
      .select("template_id")
      .eq("student_id", user.id);

    if (assigned && assigned.length > 0) {
      const { data: tmpl } = await supabase
        .from("workout_templates")
        .select("*")
        .in("id", assigned.map((a) => a.template_id));
      setTemplates(tmpl ?? []);
    }

    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("student_id", user.id)
      .order("executed_at", { ascending: false })
      .limit(10);
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

  // Student not linked to any trainer — redirect to invitation page
  if (hasTrainer === false) {
    return <Navigate to="/student/invite" replace />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Meus Treinos</h2>
          <p className="text-sm text-muted-foreground">Escolha um treino para iniciar</p>
        </div>

        {templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <ClipboardList className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">
                Seu treinador ainda não enviou seu treino.
              </p>
              <p className="text-sm text-muted-foreground mt-1.5">
                Assim que ele criar sua rotina, ela aparecerá aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                  <Button size="sm" onClick={() => navigate(`/student/session/${t.id}`)}>
                    <Play className="h-4 w-4 mr-1" /> Iniciar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {recentSessions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Últimas Sessões</h3>
            {recentSessions.map((s) => (
              <Card key={s.id}>
                <CardContent className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{s.template_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(s.executed_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{Number(s.total_volume).toLocaleString()} kg</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
