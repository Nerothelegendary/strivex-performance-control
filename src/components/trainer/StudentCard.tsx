import { Button } from "@/components/ui/button";
import { Dumbbell, UserMinus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge, getStatusInfo } from "./StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface StudentCardProps {
  studentId: string;
  fullName: string | null;
  lastSessionAt: string | null;
  assignedTemplates: number;
  onRemove?: (studentId: string) => void;
}

export function StudentCard({ studentId, fullName, lastSessionAt, assignedTemplates, onRemove }: StudentCardProps) {
  const navigate = useNavigate();
  const status = getStatusInfo(lastSessionAt, assignedTemplates);

  const getLastActivityLabel = () => {
    if (!lastSessionAt) return "—";
    const diffMs = Date.now() - new Date(lastSessionAt).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHours < 1) return "Agora mesmo";
    if (diffDays < 1) return `${diffHours} ${diffHours === 1 ? "hora" : "horas"} atrás`;
    return `${diffDays} ${diffDays === 1 ? "dia" : "dias"} atrás`;
  };

  return (
    <div
      className="rounded-xl border border-border bg-card/40 p-5 space-y-3 cursor-pointer hover:bg-card/70 active:scale-[0.98] transition-all"
      onClick={() => navigate(`/trainer/student/${studentId}`)}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold truncate text-foreground">{fullName || "Sem nome"}</p>
        <StatusBadge {...status} />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Treino ativo: {assignedTemplates > 0 ? `${assignedTemplates} atribuído(s)` : "Nenhum"}
        </p>
        <p className="text-xs text-muted-foreground">
          Última atividade: {getLastActivityLabel()}
        </p>
      </div>
      <div className="flex justify-end gap-1.5 pt-1">
        {onRemove && (
          <ConfirmDialog
            trigger={
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <UserMinus className="h-3 w-3 mr-1" /> Remover
              </Button>
            }
            title="Remover aluno"
            description={`Tem certeza que deseja remover ${fullName || "este aluno"} da sua lista? O aluno perderá acesso aos treinos atribuídos.`}
            confirmLabel="Remover"
            onConfirm={() => onRemove(studentId)}
          />
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2.5"
          onClick={(e) => { e.stopPropagation(); navigate(`/trainer/student/${studentId}`); }}
        >
          <Dumbbell className="h-3 w-3 mr-1" /> Atribuir Treino
        </Button>
      </div>
    </div>
  );
}