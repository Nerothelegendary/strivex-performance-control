import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExerciseSet {
  set_number: number;
  planned_reps: number;
  planned_weight: number;
  actual_reps: number;
  actual_weight: number;
}

interface ExerciseWithSets {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

interface SessionDraft {
  templateId: string;
  exercises: ExerciseWithSets[];
  sessionNote: string;
  savedAt: number;
}

function getDraftKey(templateId: string) {
  return `workout_draft_${templateId}`;
}

function saveDraft(templateId: string, exercises: ExerciseWithSets[], sessionNote: string) {
  const draft: SessionDraft = { templateId, exercises, sessionNote, savedAt: Date.now() };
  try {
    localStorage.setItem(getDraftKey(templateId), JSON.stringify(draft));
  } catch {
    // Storage quota exceeded — silently skip
  }
}

function loadDraft(templateId: string): SessionDraft | null {
  try {
    const raw = localStorage.getItem(getDraftKey(templateId));
    return raw ? (JSON.parse(raw) as SessionDraft) : null;
  } catch {
    return null;
  }
}

function clearDraft(templateId: string) {
  localStorage.removeItem(getDraftKey(templateId));
}

export default function WorkoutSession() {
  const { templateId } = useParams<{ templateId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Tables<"workout_templates"> | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [sessionNote, setSessionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<SessionDraft | null>(null);

  // ── Load template + check for existing draft ──────────────────────────────
  useEffect(() => {
    if (templateId) load();
  }, [templateId]);

  const load = async () => {
    const { data: t } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("id", templateId!)
      .single();
    setTemplate(t);

    const { data: exs } = await supabase
      .from("template_exercises")
      .select("*")
      .eq("template_id", templateId!)
      .order("sort_order");

    if (exs && exs.length > 0) {
      const { data: sets } = await supabase
        .from("planned_sets")
        .select("*")
        .in("exercise_id", exs.map((e) => e.id))
        .order("set_number");

      const mapped: ExerciseWithSets[] = exs.map((e) => ({
        id: e.id,
        name: e.name,
        sets: (sets?.filter((s) => s.exercise_id === e.id) ?? []).map((s) => ({
          set_number: s.set_number,
          planned_reps: s.planned_reps,
          planned_weight: Number(s.planned_weight),
          actual_reps: s.planned_reps,
          actual_weight: Number(s.planned_weight),
        })),
      }));

      // Check for a saved draft before committing fresh data
      const draft = loadDraft(templateId!);
      if (draft && draft.exercises.length > 0) {
        setPendingDraft(draft);
        setExercises(mapped); // hold fresh data in state but show restore prompt
      } else {
        setExercises(mapped);
      }
    }

    setLoading(false);
  };

  // ── Auto-save: fires on every exercises/sessionNote change ────────────────
  const autoSave = useCallback(
    (exs: ExerciseWithSets[], note: string) => {
      if (!templateId || loading) return;
      saveDraft(templateId, exs, note);
    },
    [templateId, loading]
  );

  useEffect(() => {
    if (!loading && exercises.length > 0) {
      autoSave(exercises, sessionNote);
    }
  }, [exercises, sessionNote, autoSave, loading]);

  // ── Set value updates ─────────────────────────────────────────────────────
  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: "actual_reps" | "actual_weight",
    value: number
  ) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exIdx] = {
        ...updated[exIdx],
        sets: updated[exIdx].sets.map((s, i) =>
          i === setIdx ? { ...s, [field]: value } : s
        ),
      };
      return updated;
    });
  };

  // ── Draft restore ─────────────────────────────────────────────────────────
  const restoreDraft = () => {
    if (pendingDraft) {
      setExercises(pendingDraft.exercises);
      setSessionNote(pendingDraft.sessionNote);
      toast.success("Rascunho restaurado!");
    }
    setPendingDraft(null);
    setShowRestoreConfirm(false);
  };

  const discardDraft = () => {
    if (templateId) clearDraft(templateId);
    setPendingDraft(null);
    setShowRestoreConfirm(false);
  };

  useEffect(() => {
    if (pendingDraft && !loading) {
      setShowRestoreConfirm(true);
    }
  }, [pendingDraft, loading]);

  // ── Save session ──────────────────────────────────────────────────────────
  const saveSession = async () => {
    if (!user || !template) return;
    setSaving(true);

    const allSets: { exercise_name: string; set_number: number; reps: number; weight: number }[] =
      [];
    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        allSets.push({
          exercise_name: ex.name,
          set_number: s.set_number,
          reps: s.actual_reps,
          weight: s.actual_weight,
        });
      });
    });

    // total_volume and exercise_count will be corrected by the DB trigger after sets are inserted
    const { data: session, error: sessionErr } = await supabase
      .from("workout_sessions")
      .insert({
        student_id: user.id,
        template_id: template.id,
        template_name: template.name,
        total_volume: 0,
        exercise_count: 0,
        notes: sessionNote.trim() || null,
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      toast.error("Erro ao salvar sessão.");
      setSaving(false);
      return;
    }

    if (allSets.length > 0) {
      const { error: setsErr } = await supabase
        .from("session_sets")
        .insert(allSets.map((s) => ({ ...s, session_id: session.id })));
      if (setsErr) {
        toast.error("Erro ao salvar séries.");
        setSaving(false);
        return;
      }
    }

    // Fetch trigger-computed aggregates — recalculate_session_aggregates fires after session_sets insert
    const { data: updatedSession } = await supabase
      .from("workout_sessions")
      .select("total_volume, exercise_count")
      .eq("id", session.id)
      .single();

    const dbTotalVolume = Number(updatedSession?.total_volume ?? 0);
    const dbExerciseCount = Number(updatedSession?.exercise_count ?? 0);

    // Post activity feed
    try {
      const { data: trainerId } = await supabase.rpc("get_trainer_id", {
        _student_user_id: user.id,
      });
      if (trainerId) {
        const studentName =
          user.user_metadata?.full_name || user.user_metadata?.name || "Aluno";

        // PR detection via get_personal_bests RPC — DB is the single source of truth.
        // The RPC already includes the current session since sets are persisted.
        const { data: pbData } = await supabase.rpc("get_personal_bests", {
          p_student_id: user.id,
        });

        // Build current-session max per exercise (used only to match against DB-returned PRs)
        const sessionMaxes = new Map<string, number>();
        allSets.forEach((s) => {
          const cur = sessionMaxes.get(s.exercise_name) ?? 0;
          if (s.weight > cur) sessionMaxes.set(s.exercise_name, s.weight);
        });

        // A PR is confirmed when the DB-returned max_weight matches this session's max
        const newPRs: Array<{ name: string; weight: number }> = [];
        pbData?.forEach((pb) => {
          const sessionMax = sessionMaxes.get(pb.exercise_name);
          if (sessionMax !== undefined && sessionMax >= Number(pb.max_weight) && sessionMax > 0) {
            newPRs.push({ name: pb.exercise_name, weight: Number(pb.max_weight) });
          }
        });

        await supabase.from("activity_feed").insert({
          trainer_id: trainerId,
          student_id: user.id,
          event_type: "workout_completed",
          message: `${studentName} completou o treino "${template.name}" (${dbTotalVolume.toLocaleString()} kg vol.)`,
        });

        for (const pr of newPRs) {
          await supabase.from("activity_feed").insert({
            trainer_id: trainerId,
            student_id: user.id,
            event_type: "personal_best",
            message: `🏆 ${studentName} bateu recorde em ${pr.name}: ${pr.weight} kg!`,
          });
        }
      }
    } catch (e) {
      console.warn("Failed to post activity feed:", e);
    }

    // Clear draft only after full successful save
    if (templateId) clearDraft(templateId);

    toast.success("Treino salvo com sucesso!");
    navigate("/student/summary", {
      state: {
        sessionId: session.id,
        templateId: template.id,
        templateName: template.name,
        studentId: user.id,
        totalVolume: dbTotalVolume,
        exerciseCount: dbExerciseCount,
        sets: allSets, // passed for display-only (individual set rows)
      },
      replace: true,
    });
  };

  if (loading)
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  if (!template) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowLeaveConfirm(true)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{template.name}</h2>
            <p className="text-sm text-muted-foreground">Registre sua execução</p>
          </div>
        </div>

        {exercises.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/20 py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum exercício definido neste treino.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exercises.map((ex, exIdx) => (
              <div key={ex.id} className="rounded-xl border border-border bg-card/40 p-4">
                <p className="text-sm font-semibold text-foreground mb-3">{ex.name}</p>
                {ex.sets.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">Nenhuma série.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-xs text-muted-foreground">
                      <span>#</span>
                      <span>Reps</span>
                      <span>Peso (kg)</span>
                    </div>
                    {ex.sets.map((s, setIdx) => (
                      <div
                        key={setIdx}
                        className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center"
                      >
                        <span className="text-xs text-muted-foreground">{s.set_number}</span>
                        <Input
                          type="number"
                          value={s.actual_reps}
                          className="h-8 text-sm"
                          onChange={(e) =>
                            updateSet(exIdx, setIdx, "actual_reps", Number(e.target.value))
                          }
                        />
                        <Input
                          type="number"
                          value={s.actual_weight}
                          className="h-8 text-sm"
                          onChange={(e) =>
                            updateSet(exIdx, setIdx, "actual_weight", Number(e.target.value))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Textarea
              placeholder="Observações sobre o treino (opcional)"
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              rows={3}
            />

            <Button
              onClick={saveSession}
              disabled={saving}
              className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar Treino
            </Button>
          </div>
        )}
      </div>

      {/* Leave confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent className="border-border bg-popover text-popover-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Seu progresso foi salvo como rascunho e será restaurado quando você voltar. Deseja
              sair mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar treino</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate("/student")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore draft confirmation */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent className="border-border bg-popover text-popover-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              Rascunho encontrado
            </AlertDialogTitle>
            <AlertDialogDescription>
              Encontramos um rascunho salvo deste treino de{" "}
              {pendingDraft
                ? new Date(pendingDraft.savedAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
              . Deseja restaurar seu progresso anterior?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardDraft}>Começar do zero</AlertDialogCancel>
            <AlertDialogAction
              onClick={restoreDraft}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Restaurar rascunho
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
