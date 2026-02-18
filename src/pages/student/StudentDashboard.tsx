import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Tables<"workout_templates">[]>([]);
  const [recentSessions, setRecentSessions] = useState<Tables<"workout_sessions">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user) return;

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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Meus Treinos</h2>
          <p className="text-sm text-muted-foreground">Escolha um treino para iniciar</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum treino atribuído ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Aguarde seu treinador atribuir treinos.</p>
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
