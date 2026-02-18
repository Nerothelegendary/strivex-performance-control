import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Link2, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { differenceInDays } from "date-fns";

interface StudentData {
  student_id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_session_at: string | null;
}

export default function TrainerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", studentIds);

    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("student_id, executed_at")
      .in("student_id", studentIds)
      .order("executed_at", { ascending: false });

    const lastSessionMap = new Map<string, string>();
    sessions?.forEach((s) => {
      if (!lastSessionMap.has(s.student_id)) {
        lastSessionMap.set(s.student_id, s.executed_at);
      }
    });

    const result: StudentData[] = studentIds.map((sid) => {
      const p = profiles?.find((p) => p.user_id === sid);
      return {
        student_id: sid,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        last_session_at: lastSessionMap.get(sid) ?? null,
      };
    });

    setStudents(result);
    setLoading(false);
  };

  const getStatusColor = (lastSession: string | null) => {
    if (!lastSession) return "bg-status-red";
    const days = differenceInDays(new Date(), new Date(lastSession));
    if (days <= 4) return "bg-status-green";
    if (days <= 6) return "bg-status-yellow";
    return "bg-status-red";
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Alunos</h2>
            <p className="text-sm text-muted-foreground">{students.length} aluno(s) vinculado(s)</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/trainer/templates")}>
              <FileText className="h-4 w-4 mr-1" /> Treinos
            </Button>
            <Button size="sm" onClick={generateInvite}>
              <Link2 className="h-4 w-4 mr-1" /> Convidar Aluno
            </Button>
          </div>
        </div>

        {inviteLink && (
          <Card className="bg-secondary">
            <CardContent className="py-3 flex items-center justify-between gap-2">
              <code className="text-xs truncate flex-1">{inviteLink}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  toast.success("Copiado!");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum aluno vinculado ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Gere um link de convite para adicionar alunos.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((s) => (
              <Card
                key={s.student_id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/trainer/student/${s.student_id}`)}
              >
                <CardContent className="py-4 flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${getStatusColor(s.last_session_at)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.last_session_at
                        ? `Último treino: ${differenceInDays(new Date(), new Date(s.last_session_at))} dia(s) atrás`
                        : "Nenhum treino registrado"}
                    </p>
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
