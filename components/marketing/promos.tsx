"use client";

import { ArrowRight, Lightbulb, MessageSquareHeart, TrendingDown } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { AiBadge } from "@/components/shared/ai-bits";
import { tooltipStyle } from "@/components/shared/mini-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { smartPromos } from "@/lib/agent/content";
import { weekdayRevenue } from "@/lib/analytics";
import { formatMoney } from "@/lib/utils";
import { useData } from "@/store/app-store";

const ICONS = { weekday: TrendingDown, service: Lightbulb, sleeping: MessageSquareHeart };

export function SmartPromos({ onLaunch }: { onLaunch: (promoId: string) => void }) {
  const data = useData();
  const promos = smartPromos(data);
  const wd = weekdayRevenue(data);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Агент сопоставил выручку из бухгалтерии, заявки и историю клиентов и предлагает акции с прогнозом эффекта.</p>
        {promos.map((p, i) => {
          const I = ICONS[p.id as keyof typeof ICONS] ?? Lightbulb;
          return (
            <Card key={p.id} className="p-4 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex flex-wrap items-start gap-3 sm:gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ai-gradient text-white shadow-sm">
                  <I className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 basis-[200px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{p.title}</span>
                    <Badge variant="secondary">из модуля «{p.badge}»</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.reason}</p>
                  <div className="mt-2 text-xs">
                    Прогноз: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.effect}</span>
                  </div>
                </div>
                <Button variant={i === 0 ? "ai" : "outline"} onClick={() => onLaunch(p.id)} className="w-full sm:w-auto">
                  Запустить <ArrowRight />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Выручка по дням недели <AiBadge />
          </CardTitle>
          <p className="text-xs text-muted-foreground">Средняя за 8 недель</p>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wd.rows}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatMoney(v), "Выручка"]} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {wd.rows.map((r) => (
                    <Cell key={r.name} fill={r.wd === wd.weakest.wd ? "hsl(15 85% 58%)" : "hsl(250 78% 60% / 0.75)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {wd.weakest.name}: {formatMoney(wd.weakest.value)} — на {wd.dropPct}% ниже среднего.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
