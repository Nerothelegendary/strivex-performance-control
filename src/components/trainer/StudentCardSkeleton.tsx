import { Skeleton } from "@/components/ui/skeleton";

export function StudentCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex justify-end pt-1">
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>
    </div>
  );
}
