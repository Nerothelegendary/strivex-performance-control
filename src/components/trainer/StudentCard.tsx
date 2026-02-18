import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge, getStatusInfo } from "./StatusBadge";

interface StudentCardProps {
  studentId: string;
  fullName: string | null;
  lastSessionAt: string | null;
  assignedTemplates: number;
}

export function StudentCard({ studentId, fullName, lastSessionAt, assignedTemplates }: StudentCardProps) {
  const navigate = useNavigate();
  const status = getStatusInfo(lastSessionAt, assignedTemplates);

  const daysSinceLastSession = lastSessionAt
    ? Math.floor((Date.now() - new Date(lastSessionAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
          Última atividade: {daysSinceLastSession !== null ? `${daysSinceLastSession} dia(s) atrás` : "—"}
        </p>
      </div>
      <div className="flex justify-end pt-1">
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
