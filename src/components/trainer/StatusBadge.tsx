import { Badge } from "@/components/ui/badge";

export type StatusVariant = "success" | "warning" | "danger";

interface StatusInfo {
  label: string;
  variant: StatusVariant;
}

export function getStatusInfo(lastSession: string | null, assignedTemplates: number): StatusInfo {
  if (assignedTemplates === 0) return { label: "Aguardando programação", variant: "warning" };
  if (!lastSession) return { label: "Aguardando primeiro treino", variant: "warning" };
  const days = Math.floor((Date.now() - new Date(lastSession).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 4) return { label: "Em dia", variant: "success" };
  if (days <= 6) return { label: "Atenção", variant: "warning" };
  return { label: "Inativo", variant: "danger" };
}

const variantClasses: Record<StatusVariant, string> = {
  success: "bg-emerald-400/15 text-emerald-300 border-emerald-400/20",
  warning: "bg-yellow-400/15 text-yellow-300 border-yellow-400/20",
  danger: "bg-red-400/15 text-red-300 border-red-400/20",
};

export function StatusBadge({ variant, label }: StatusInfo) {
  return (
    <Badge className={`${variantClasses[variant]} text-[10px] px-2 py-0.5`}>
      {label}
    </Badge>
  );
}
