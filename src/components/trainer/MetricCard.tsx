import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  loading?: boolean;
}

export function MetricCard({ icon: Icon, value, label, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-5 text-center">
        <Skeleton className="h-8 w-8 rounded-lg mx-auto mb-2" />
        <Skeleton className="h-6 w-10 mx-auto mb-1" />
        <Skeleton className="h-3 w-16 mx-auto" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary mx-auto mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
    </div>
  );
}
