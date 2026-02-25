import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Users, Link2, Copy, FileText, ClipboardList, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "@/components/trainer/MetricCard";
import { StudentCard } from "@/components/trainer/StudentCard";
import { StudentCardSkeleton } from "@/components/trainer/StudentCardSkeleton";
import { getStatusInfo } from "@/components/trainer/StatusBadge";
import { InactivityAlerts } from "@/components/trainer/InactivityAlerts";
import { ActivityFeed } from "@/components/trainer/ActivityFeed";
import { OnboardingChecklist } from "@/components/trainer/OnboardingChecklist";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [hasTemplates, setHasTemplates] = useState(false);
  const [hasAssignments, setHasAssignments] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadStudents();
  }, [user]);

  const loadStudents = async () => {
    if (!user) return;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [linksRes, templatesCountRes] = await Promise.all([
      supabase.from("trainer_students").select("student_id").eq("trainer_id", user.id),
      supabase.from("workout_templates").select("id", { count: "exact", head: true }).eq("trainer_id", user.id),
    ]);

    setHasTemplates((templatesCountRes.count ?? 0) > 0);

    const links = linksRes.data;
    if (!links || links.length === 0) { setStudents([]); setLoading(false); return; }

    const studentIds = links.map((l) => l.student_id);

    const [profilesRes, lastSessionsRes, weeklySessionsRes, templatesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", studentIds),
      supabase.rpc("get_last_sessions", { p_student_ids: studentIds }),
      supabase.from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .in("student_id", studentIds)
        .gte("executed_at", weekAgo.toISOString()),
      supabase.from("student_templates").select("student_id, template_id").in("student_id", studentIds),
    ]);

    const profiles = profilesRes.data;
    const lastSessions = (lastSessionsRes.data ?? []) as { student_id: string; last_session_at: string | null }[];
    const templates = templatesRes.data;

    const lastSessionMap = new Map<string, string>();
    lastSessions.forEach((s) => { if (s.last_session_at) lastSessionMap.set(s.student_id, s.last_session_at); });

    const templateCountMap = new Map<string, number>();
    templates?.forEach((t) => { templateCountMap.set(t.student_id, (templateCountMap.get(t.student_id) ?? 0) + 1); });

    setWeeklyCompleted(weeklySessionsRes.count ?? 0);
    setTotalAssigned(templates?.length ?? 0);
    setHasAssignments((templates?.length ?? 0) > 0);

    setStudents(studentIds.map((sid) => {
      const p = profiles?.find((p) => p.user_id === sid);
      return {
        student_id: sid,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        last_session_at: lastSessionMap.get(sid) ?? null,
        assigned_templates: templateCountMap.get(sid) ?? 0,
      };
    }));
    setLoading(false);
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch = !searchQuery || (s.full_name ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (!statusFilter) return true;
    return getStatusInfo(s.last_session_at, s.assigned_templates).variant === statusFilter;
  });

  const generateInvite = async () => {
    if (!user) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const { data, error } = await supabase.from("invitations").insert({ trainer_id: user.id, expires_at: expiresAt.toISOString() }).select("token").single();
    if (error) { toast.error("Erro ao gerar convite."); return; }
    const link = `${window.location.origin}/invite?token=${data.token}`;
    setInviteLink(link);
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  const removeStudent = async (studentId: string) => {
    const { error } = await supabase.from("trainer_students").delete().eq("student_id", studentId).eq("trainer_id", user!.id);
    if (error) { toast.error("Erro ao remover aluno."); return; }
    toast.success("Aluno removido.");
    loadStudents();
  };


    const statusFilters = [
    { key: "success", label: "Em dia" },
    { key: "warning", label: "Atenção" },
    { key: "danger", label: "Inativo" },
  ] as const;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="space-y-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Painel do Treinador</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Visão geral dos seus alunos e treinos</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate("/trainer/templates")}>
              <FileText className="h-4 w-4 mr-1" /> Treinos
            </Button>
            <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={generateInvite}>
              <Link2 className="h-4 w-4 mr-1" /> Convidar
            </Button>
          </div>
        </div>

        {inviteLink && (
          <div className="rounded-xl border border-border bg-secondary p-3 flex items-center justify-between gap-2">
            <code className="text-xs truncate flex-1 text-muted-foreground">{inviteLink}</code>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copiado!"); setTimeout(() => setInviteLink(null), 1500); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInviteLink(null)}>✕</Button>
            </div>
          </div>
        )}

        {/* Onboarding Checklist — shown until all 3 steps are complete */}
        {!loading && (!hasTemplates || students.length === 0 || !hasAssignments) && (
          <OnboardingChecklist
            hasTemplates={hasTemplates}
            hasStudents={students.length > 0}
            hasAssignments={hasAssignments}
            onNavigateTemplates={() => navigate("/trainer/templates")}
            onInvite={generateInvite}
            onNavigateStudents={() => navigate("/trainer/templates")}
          />
        )}

        <div className="grid grid-cols-3 gap-2">
          <MetricCard icon={Users} value={students.length} label="Alunos ativos" loading={loading} />
          <MetricCard icon={ClipboardList} value={totalAssigned} label="Treinos atribuídos" loading={loading} />
          <MetricCard icon={CheckCircle2} value={weeklyCompleted} label="Concluídos na semana" loading={loading} />
        </div>

        {/* Inactivity Alerts */}
        {!loading && <InactivityAlerts students={students} onStudentClick={(id) => navigate(`/trainer/student/${id}`)} />}

        {/* Activity Feed */}
        <ActivityFeed />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Alunos</h2>
            <p className="text-xs text-muted-foreground">{filteredStudents.length} aluno(s)</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar aluno..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>

          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((f) => (
              <button key={f.label} onClick={() => setStatusFilter(f.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  statusFilter === f.key
                    ? f.key === "success" ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
                      : f.key === "warning" ? "bg-yellow-400/20 text-yellow-300 border-yellow-400/30"
                      : f.key === "danger" ? "bg-red-400/20 text-red-300 border-red-400/30"
                      : "bg-secondary text-foreground border-border"
                    : "bg-card/40 text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                }`}
              >{f.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">{[1, 2, 3, 4].map((i) => <StudentCardSkeleton key={i} />)}</div>
          ) : students.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/20 py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum aluno vinculado ainda.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Gere um link de convite para adicionar alunos.</p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {filteredStudents.map((s) => (
                <StudentCard key={s.student_id} studentId={s.student_id} fullName={s.full_name} lastSessionAt={s.last_session_at} assignedTemplates={s.assigned_templates} onRemove={removeStudent} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
