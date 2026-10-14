"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { AiBadge } from "@/components/shared/ai-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildInsights } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useData } from "@/store/app-store";

const TONE = {
  warning: { icon: TrendingDown, cls: "text-amber-600 bg-amber-500/10 dark:text-amber-400" },
  info: { icon: TrendingUp, cls: "text-red-600 bg-red-500/10 dark:text-red-400" },
  success: { icon: Lightbulb, cls: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" },
};

export function Insights() {
  const data = useData();
  const insights = buildInsights(data);
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          Агент заметил <AiBadge />
        </CardTitle>
        <span className="text-xs text-muted-foreground">на основе данных всех модулей</span>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {insights.map((ins, i) => {
          const T = TONE[ins.tone];
          return (
            <div key={ins.id} className="rounded-lg border bg-background p-3 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex gap-3">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", T.cls)}>
                  <T.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{ins.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{ins.text}</p>
                  <Button asChild size="sm" variant={i === 0 ? "ai" : "outline"} className="mt-2.5 h-7">
                    <Link href={ins.href}>
                      {ins.action} <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
