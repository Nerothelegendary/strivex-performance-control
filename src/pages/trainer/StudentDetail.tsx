import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

export default function StudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [studentProfile, setStudentProfile] = useState<Tables<"profiles"> | null>(null);
  const [sessions, setSessions] = useState<Tables<"workout_sessions">[]>([]);
  const [note, setNote] = useState("");
  const [existingNote, setExistingNote] = useState<Tables<"trainer_notes"> | null>(null);
  const [allTemplates, setAllTemplates] = useState<Tables<"workout_templates">[]>([]);
  const [assignedTemplateIds, setAssignedTemplateIds] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionSets, setSessionSets] = useState<Tables<"session_sets">[]>([]);

  useEffect(() => {
    if (user && studentId) loadAll();
  }, [user, studentId]);

  const loadAll = async () => {
    if (!user || !studentId) return;
    const [profileRes, sessionsRes, noteRes, templatesRes, assignedRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", studentId).single(),
      supabase.from("workout_sessions").select("*").eq("student_id", studentId).order("executed_at", { ascending: false }),
      supabase.from("trainer_notes").select("*").eq("trainer_id", user.id).eq("student_id", studentId).maybeSingle(),
      supabase.from("workout_templates").select("*").eq("trainer_id", user.id).order("name"),
      supabase.from("student_templates").select("template_id").eq("student_id", studentId),
    ]);
    setStudentProfile(profileRes.data);
    setSessions(sessionsRes.data ?? []);
    setExistingNote(noteRes.data);
    setNote(noteRes.data?.content ?? "");
    setAllTemplates(templatesRes.data ?? []);
    setAssignedTemplateIds(new Set((assignedRes.data ?? []).map((a) => a.template_id)));
  };

  const saveNote = async () => {
    if (!user || !studentId) return;
    if (existingNote) {
      await supabase.from("trainer_notes").update({ content: note }).eq("id", existingNote.id);
    } else {
      await supabase.from("trainer_notes").insert({ trainer_id: user.id, student_id: studentId, content: note });
    }
    toast.success("Nota salva.");
    loadAll();
  };

  const toggleTemplate = async (templateId: string, assigned: boolean) => {
    if (!studentId) return;
    if (assigned) {
      await supabase.from("student_templates").delete().eq("student_id", studentId).eq("template_id", templateId);
    } else {
      await supabase.from("student_templates").insert({ student_id: studentId, template_id: templateId });
    }
    loadAll();
  };

  const viewSessionSets = async (sessionId: string) => {
    if (selectedSession === sessionId) { setSelectedSession(null); return; }
    const { data } = await supabase.from("session_sets").select("*").eq("session_id", sessionId).order("exercise_name").order("set_number");
    setSessionSets(data ?? []);
    setSelectedSession(sessionId);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/trainer")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-white">{studentProfile?.full_name || "Aluno"}</h2>
        </div>

        <Tabs defaultValue="history">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="history" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Histórico</TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Treinos</TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-3 mt-4">
            {sessions.length === 0 ? (
              <p className="text-sm text-white/40">Nenhum treino registrado.</p>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 cursor-pointer hover:bg-white/[0.07] transition-all" onClick={() => viewSessionSets(s.id)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-white">{s.template_name}</p>
                      <p className="text-xs text-white/40">{format(new Date(s.executed_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/40">{s.exercise_count} exercício(s)</p>
                      <p className="text-xs text-white/40">{Number(s.total_volume).toLocaleString()} kg vol.</p>
                    </div>
                  </div>
                  {s.notes && <p className="text-xs text-white/30 mt-2 italic">"{s.notes}"</p>}
                  {selectedSession === s.id && sessionSets.length > 0 && (
                    <div className="mt-3 border-t border-white/10 pt-3 space-y-1">
                      {sessionSets.map((ss) => (
                        <div key={ss.id} className="grid grid-cols-[1fr_auto_auto] gap-4 text-xs">
                          <span className="text-white/70">{ss.exercise_name}</span>
                          <span className="text-white/40">{ss.reps} reps</span>
                          <span className="text-white/40">{ss.weight} kg</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-3 mt-4">
            {allTemplates.length === 0 ? (
              <p className="text-sm text-white/40">Crie modelos de treino primeiro.</p>
            ) : (
              allTemplates.map((t) => {
                const assigned = assignedTemplateIds.has(t.id);
                return (
                  <div key={t.id} className="flex items-center gap-3 py-2">
                    <Checkbox checked={assigned} onCheckedChange={() => toggleTemplate(t.id, assigned)}
                      className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
                    <div>
                      <p className="text-sm text-white">{t.name}</p>
                      {t.description && <p className="text-xs text-white/40">{t.description}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-3 mt-4">
            <Textarea placeholder="Notas privadas sobre o aluno..." value={note} onChange={(e) => setNote(e.target.value)} rows={6}
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            <Button size="sm" onClick={saveNote} style={{ background: 'linear-gradient(135deg, hsl(224 76% 33%), hsl(217 91% 60%))' }}>
              <Save className="h-4 w-4 mr-1" /> Salvar Nota
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
