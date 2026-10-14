import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label, value, hint, delta, icon, accent, className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: number;
  icon?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-4 animate-fade-in-up", accent && "ai-glow", className)}>
      {accent && <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full ai-gradient opacity-15 blur-2xl" />}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {delta !== undefined && (
          <span className={cn("inline-flex items-center font-medium", delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint}
      </div>
    </Card>
  );
}
