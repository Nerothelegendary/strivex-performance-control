import { CheckCircle2, Circle, FileText, Link2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  label: string;
  description: string;
  icon: React.ElementType;
  done: boolean;
  action: () => void;
  actionLabel: string;
}

interface OnboardingChecklistProps {
  hasTemplates: boolean;
  hasStudents: boolean;
  hasAssignments: boolean;
  onNavigateTemplates: () => void;
  onInvite: () => void;
  onNavigateStudents: () => void;
}

export function OnboardingChecklist({
  hasTemplates,
  hasStudents,
  hasAssignments,
  onNavigateTemplates,
  onInvite,
  onNavigateStudents,
}: OnboardingChecklistProps) {
  const steps: Step[] = [
    {
      label: "Crie seu primeiro treino",
      description: "Monte um modelo com exercícios e séries para seus alunos.",
      icon: FileText,
      done: hasTemplates,
      action: onNavigateTemplates,
      actionLabel: "Criar treino",
    },
    {
      label: "Convide seu primeiro aluno",
      description: "Gere um link de convite e compartilhe com seu aluno.",
      icon: Link2,
      done: hasStudents,
      action: onInvite,
      actionLabel: "Convidar aluno",
    },
    {
      label: "Atribua um treino ao aluno",
      description: "Vincule um modelo de treino ao aluno para que ele possa executar.",
      icon: ClipboardList,
      done: hasAssignments,
      action: onNavigateStudents,
      actionLabel: "Atribuir treino",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (allDone) return null;

  return (
    <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Primeiros passos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure o Strivex em 3 etapas simples
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {completedCount}/{steps.length}
            </span>
            <div className="flex gap-1">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition-colors ${
                    s.done ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-border/30">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                step.done ? "opacity-50" : ""
              }`}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>

              {/* Step icon */}
              <div
                className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                  step.done ? "bg-secondary" : "bg-primary/10"
                }`}
              >
                <Icon className={`h-4 w-4 ${step.done ? "text-muted-foreground" : "text-primary"}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    step.done ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>

              {/* Action */}
              {!step.done && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 text-xs px-2.5"
                  onClick={step.action}
                >
                  {step.actionLabel}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
