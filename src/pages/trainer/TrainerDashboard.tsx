import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Link2, Copy, FileText, ClipboardList, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { differenceInDays } from "date-fns";

interface StudentData {
  student_id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_session_at: string | null;
  assigned_templates: number;
}

export default function TrainerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyCompleted, setWeeklyCompleted] = useState(0);
  const [totalAssigned, setTotalAssigned] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadStudents();
  }, [user]);

  const loadStudents = async () => {
    if (!user) return;
    const { data: links } = await supabase
      .from("trainer_students")
      .select("student_id")
      .eq("trainer_id", user.id);

    if (!links || links.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const studentIds = links.map((l) => l.student_id);

    const [profilesRes, sessionsRes, templatesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", studentIds),
      supabase
        .from("workout_sessions")
        .select("student_id, executed_at")
        .in("student_id", studentIds)
        .order("executed_at", { ascending: false }),
      supabase
        .from("student_templates")
        .select("student_id, template_id")
        .in("student_id", studentIds),
    ]);

    const profiles = profilesRes.data;
    const sessions = sessionsRes.data;
    const templates = templatesRes.data;

    const lastSessionMap = new Map<string, string>();
    sessions?.forEach((s) => {
      if (!lastSessionMap.has(s.student_id)) {
        lastSessionMap.set(s.student_id, s.executed_at);
      }
    });

    const templateCountMap = new Map<string, number>();
    templates?.forEach((t) => {
      templateCountMap.set(t.student_id, (templateCountMap.get(t.student_id) ?? 0) + 1);
    });

    // Weekly completed sessions
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const completed = sessions?.filter(
      (s) => new Date(s.executed_at) >= weekAgo
    ).length ?? 0;
    setWeeklyCompleted(completed);
    setTotalAssigned(templates?.length ?? 0);

    const result: StudentData[] = studentIds.map((sid) => {
      const p = profiles?.find((p) => p.user_id === sid);
      return {
        student_id: sid,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        last_session_at: lastSessionMap.get(sid) ?? null,
        assigned_templates: templateCountMap.get(sid) ?? 0,
      };
    });

    setStudents(result);
    setLoading(false);
  };

  const getStatusInfo = (lastSession: string | null, assignedTemplates: number) => {
    if (assignedTemplates === 0) {
      return { label: "Aguardando programação", color: "bg-muted-foreground/40" };
    }
    if (!lastSession) {
      return { label: "Aguardando primeiro treino", color: "bg-status-yellow" };
    }
    const days = differenceInDays(new Date(), new Date(lastSession));
    if (days <= 4) return { label: "Em dia", color: "bg-status-green" };
    if (days <= 6) return { label: "Atenção", color: "bg-status-yellow" };
    return { label: "Inativo", color: "bg-status-red" };
  };

  const generateInvite = async () => {
    if (!user) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await supabase
      .from("invitations")
      .insert({ trainer_id: user.id, expires_at: expiresAt.toISOString() })
      .select("token")
      .single();

    if (error) {
      toast.error("Erro ao gerar convite.");
      return;
    }

    const link = `${window.location.origin}/invite?token=${data.token}`;
    setInviteLink(link);
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Painel do Treinador</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Visão geral dos seus alunos e treinos</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate("/trainer/templates")}>
              <FileText className="h-4 w-4 mr-1" /> Treinos
            </Button>
            <Button size="sm" className="flex-1" onClick={generateInvite}>
              <Link2 className="h-4 w-4 mr-1" /> Convidar
            </Button>
          </div>
        </div>

        {/* Invite Link Banner */}
        {inviteLink && (
          <Card className="bg-secondary border-dashed">
            <CardContent className="py-3 flex items-center justify-between gap-2">
              <code className="text-xs truncate flex-1 text-muted-foreground">{inviteLink}</code>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success("Copiado!");
                    setTimeout(() => setInviteLink(null), 1500);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setInviteLink(null)}>
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="py-4 px-3 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 mx-auto mb-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xl font-bold text-foreground">{students.length}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Alunos ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 px-3 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 mx-auto mb-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xl font-bold text-foreground">{totalAssigned}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Treinos atribuídos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 px-3 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 mx-auto mb-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xl font-bold text-foreground">{weeklyCompleted}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Concluídos na semana</p>
            </CardContent>
          </Card>
        </div>

        {/* Student List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Alunos</h2>
            <p className="text-xs text-muted-foreground">{students.length} aluno(s)</p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : students.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum aluno vinculado ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gere um link de convite para adicionar alunos.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {students.map((s) => {
                const status = getStatusInfo(s.last_session_at, s.assigned_templates);
                return (
                  <Card
                    key={s.student_id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/trainer/student/${s.student_id}`)}
                  >
                    <CardContent className="py-4 space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${status.color}`} />
                        <p className="text-sm font-semibold truncate text-foreground">
                          {s.full_name || "Sem nome"}
                        </p>
                      </div>
                      <div className="space-y-1 pl-[18px]">
                        <p className="text-xs text-muted-foreground">
                          Treino ativo: {s.assigned_templates > 0 ? `${s.assigned_templates} atribuído(s)` : "Nenhum"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status: {status.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Última atividade:{" "}
                          {s.last_session_at
                            ? `${differenceInDays(new Date(), new Date(s.last_session_at))} dia(s) atrás`
                            : "—"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
