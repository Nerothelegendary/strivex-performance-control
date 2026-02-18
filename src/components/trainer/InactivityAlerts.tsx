import { AlertTriangle } from "lucide-react";
import { getStatusInfo } from "@/components/trainer/StatusBadge";

interface StudentData {
  student_id: string;
  full_name: string | null;
  last_session_at: string | null;
  assigned_templates: number;
}

interface InactivityAlertsProps {
  students: StudentData[];
  onStudentClick: (studentId: string) => void;
}

export function InactivityAlerts({ students, onStudentClick }: InactivityAlertsProps) {
  const needsAttention = students.filter((s) => {
    const status = getStatusInfo(s.last_session_at, s.assigned_templates);
    return status.variant === "danger" || status.variant === "warning";
  });

  if (needsAttention.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <h3 className="text-sm font-semibold text-foreground">Precisam de Atenção</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400/15 text-yellow-300 font-medium">
          {needsAttention.length}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {needsAttention.map((s) => {
          const status = getStatusInfo(s.last_session_at, s.assigned_templates);
          const days = s.last_session_at
            ? Math.floor((Date.now() - new Date(s.last_session_at).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          return (
            <button
              key={s.student_id}
              onClick={() => onStudentClick(s.student_id)}
              className="shrink-0 rounded-lg border border-border bg-card/40 px-3 py-2 text-left hover:bg-card/70 transition-colors"
            >
              <p className="text-xs font-medium text-foreground truncate max-w-[120px]">{s.full_name || "Sem nome"}</p>
              <p className={`text-[10px] ${status.variant === "danger" ? "text-red-400" : "text-yellow-400"}`}>
                {days !== null ? `${days}d sem treinar` : status.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
