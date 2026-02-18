import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Users, Link2, Copy, FileText, ClipboardList, CheckCircle2, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

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
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", studentIds),
      supabase.from("workout_sessions").select("student_id, executed_at").in("student_id", studentIds).order("executed_at", { ascending: false }),
      supabase.from("student_templates").select("student_id, template_id").in("student_id", studentIds),
    ]);

    const profiles = profilesRes.data;
    const sessions = sessionsRes.data;
    const templates = templatesRes.data;

    const lastSessionMap = new Map<string, string>();
    sessions?.forEach((s) => {
      if (!lastSessionMap.has(s.student_id)) lastSessionMap.set(s.student_id, s.executed_at);
    });

    const templateCountMap = new Map<string, number>();
    templates?.forEach((t) => {
      templateCountMap.set(t.student_id, (templateCountMap.get(t.student_id) ?? 0) + 1);
    });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const completed = sessions?.filter((s) => new Date(s.executed_at) >= weekAgo).length ?? 0;
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
    if (assignedTemplates === 0) return { label: "Aguardando programação", variant: "warning" as const };
    if (!lastSession) return { label: "Aguardando primeiro treino", variant: "warning" as const };
    const days = differenceInDays(new Date(), new Date(lastSession));
    if (days <= 4) return { label: "Em dia", variant: "success" as const };
    if (days <= 6) return { label: "Atenção", variant: "warning" as const };
    return { label: "Inativo", variant: "danger" as const };
  };

  const filteredStudents = students.filter((s) => {
    if (!statusFilter) return true;
    const status = getStatusInfo(s.last_session_at, s.assigned_templates);
    return status.variant === statusFilter;
  });

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
            <h1 className="text-xl font-bold tracking-tight text-white">Painel do Treinador</h1>
            <p className="text-xs text-white/40 mt-0.5">Visão geral dos seus alunos e treinos</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" onClick={() => navigate("/trainer/templates")}>
              <FileText className="h-4 w-4 mr-1" /> Treinos
            </Button>
            <Button size="sm" className="flex-1" style={{ background: 'linear-gradient(135deg, hsl(224 76% 33%), hsl(217 91% 60%))' }} onClick={generateInvite}>
              <Link2 className="h-4 w-4 mr-1" /> Convidar
            </Button>
          </div>
        </div>

        {/* Invite Link Banner */}
        {inviteLink && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-2">
            <code className="text-xs truncate flex-1 text-white/50">{inviteLink}</code>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="text-white/50 hover:text-white hover:bg-white/10"
                onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copiado!"); setTimeout(() => setInviteLink(null), 1500); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => setInviteLink(null)}>✕</Button>
            </div>
          </div>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Users, value: students.length, label: "Alunos ativos" },
            { icon: ClipboardList, value: totalAssigned, label: "Treinos atribuídos" },
            { icon: CheckCircle2, value: weeklyCompleted, label: "Concluídos na semana" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 mx-auto mb-2">
                <Icon className="h-3.5 w-3.5 text-white/70" />
              </div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-[10px] text-white/40 leading-tight mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Student List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Alunos</h2>
            <p className="text-xs text-white/40">{filteredStudents.length} aluno(s)</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { key: null, label: "Todos" },
              { key: "success", label: "Em dia" },
              { key: "warning", label: "Atenção" },
              { key: "danger", label: "Inativo" },
            ].map((f) => (
              <button
                key={f.label}
                onClick={() => setStatusFilter(f.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  statusFilter === f.key
                    ? f.key === "success"
                      ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
                      : f.key === "warning"
                      ? "bg-yellow-400/20 text-yellow-300 border-yellow-400/30"
                      : f.key === "danger"
                      ? "bg-red-400/20 text-red-300 border-red-400/30"
                      : "bg-white/15 text-white border-white/20"
                    : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-white/40">Carregando...</p>
          ) : students.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
              <Users className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Nenhum aluno vinculado ainda.</p>
              <p className="text-xs text-white/25 mt-1">Gere um link de convite para adicionar alunos.</p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {filteredStudents.map((s) => {
                const status = getStatusInfo(s.last_session_at, s.assigned_templates);
                return (
                  <div
                    key={s.student_id}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-5 space-y-3 cursor-pointer hover:bg-white/[0.07] active:scale-[0.98] transition-all"
                    onClick={() => navigate(`/trainer/student/${s.student_id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate text-white">{s.full_name || "Sem nome"}</p>
                      <Badge className={
                        status.variant === "success"
                          ? "bg-emerald-400/15 text-emerald-300 border-emerald-400/20 text-[10px] px-2 py-0.5"
                          : status.variant === "warning"
                          ? "bg-yellow-400/15 text-yellow-300 border-yellow-400/20 text-[10px] px-2 py-0.5"
                          : "bg-red-400/15 text-red-300 border-red-400/20 text-[10px] px-2 py-0.5"
                      }>{status.label}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-white/40">Treino ativo: {s.assigned_templates > 0 ? `${s.assigned_templates} atribuído(s)` : "Nenhum"}</p>
                      <p className="text-xs text-white/40">
                        Última atividade:{" "}
                        {s.last_session_at ? `${differenceInDays(new Date(), new Date(s.last_session_at))} dia(s) atrás` : "—"}
                      </p>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white text-xs h-7 px-2.5"
                        onClick={(e) => { e.stopPropagation(); navigate(`/trainer/student/${s.student_id}`); }}
                      >
                        <Dumbbell className="h-3 w-3 mr-1" /> Atribuir Treino
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
