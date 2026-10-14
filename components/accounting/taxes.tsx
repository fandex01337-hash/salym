"use client";

import { useState } from "react";
import { BellRing, CalendarClock, FileCheck2, Info, Landmark } from "lucide-react";
import { toast } from "sonner";
import { AiBadge } from "@/components/shared/ai-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/misc";
import { estimateTax } from "@/lib/agent/tax";
import { cn, formatDate, formatMoney, plural } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";

const KIND = {
  declaration: { label: "Декларация", cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400", icon: FileCheck2 },
  payment: { label: "Оплата", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: Landmark },
  social: { label: "Соцплатежи", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400", icon: CalendarClock },
};

export function Taxes() {
  const data = useData();
  const addActivity = useAppStore((s) => s.addActivity);
  const t = estimateTax(data);
  const [open, setOpen] = useState(false);
  const now = Date.now();
  const elapsed = ((now - t.periodStart.getTime()) / (t.periodEnd.getTime() - t.periodStart.getTime())) * 100;

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <div className="space-y-4 xl:col-span-2">
        <Card className="ai-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Упрощённая декларация (ф. 910) <AiBadge />
            </CardTitle>
            <p className="text-xs text-muted-foreground">ИП на специальном налоговом режиме · {t.periodLabel}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Полугодие прошло на {Math.round(elapsed)}%</span>
                <span>{formatDate(t.periodEnd)}</span>
              </div>
              <Progress value={elapsed} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Доход с начала периода</div>
                <div className="mt-1 font-semibold tabular-nums">≈ {formatMoney(t.income)}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Прогноз за полугодие</div>
                <div className="mt-1 font-semibold tabular-nums">≈ {formatMoney(t.projected)}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Ставка</div>
                <div className="mt-1 font-semibold">{t.ratePct}% от дохода</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <div className="text-xs text-primary">Налог к уплате (прогноз)</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-primary">{formatMoney(t.tax)}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Агент откладывает {formatMoney(Math.round(t.tax / 6))} в месяц на налоговый резерв, чтобы оплата в феврале не стала сюрпризом.
            </p>
            <Button variant="ai" className="w-full" onClick={() => setOpen(true)}>
              <FileCheck2 /> Подготовить черновик 910
            </Button>
          </CardContent>
        </Card>
        <div className="flex gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          Демо-расчёт: базовая ставка 4% (НК РК 2026), маслихат может менять её в пределах ±50%. Перед сдачей сверяйтесь с кабинетом налогоплательщика.
        </div>
      </div>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>Налоговый календарь</CardTitle>
          <p className="text-xs text-muted-foreground">Агент напомнит за 5 дней и подготовит платёжки</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {t.deadlines.map((d) => {
            const K = KIND[d.kind];
            const days = Math.ceil((new Date(d.iso).getTime() - now) / 86400000);
            return (
              <div key={d.iso + d.kind} className="flex items-center gap-3 rounded-lg border p-2.5 sm:p-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10", K.cls)}>
                  <K.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{d.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>до {d.date}</span>
                    <Badge variant={days <= 14 ? "warning" : "secondary"}>
                      через {days} {plural(days, ["день", "дня", "дней"])}
                    </Badge>
                    {d.amount && <span className="tabular-nums">≈ {formatMoney(d.amount)}</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    addActivity({ kind: "reminder", text: `Поставил напоминание: ${d.title.toLowerCase()} (${d.date})`, href: "/accounting?tab=taxes" });
                    toast.success("Напоминание включено", { description: `Напомню в WhatsApp за 5 дней до ${d.date}` });
                  }}
                >
                  <BellRing /> <span className="hidden sm:inline">Напомнить</span>
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Черновик формы 910.00</DialogTitle>
            <DialogDescription>Агент заполнил декларацию по данным бухгалтерии</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
            {[
              ["Налоговый период", t.periodLabel],
              ["Налогоплательщик", `ИП ${data.owner}`],
              ["910.00.001 Доход за период", formatMoney(t.projected)],
              ["910.00.003 Среднесписочная численность", `${data.employees.length} чел.`],
              ["910.00.005 Сумма налога (4%)", formatMoney(t.tax)],
              ["Соцплатежи за работников / мес", formatMoney(t.socialMonthly)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-dashed pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-right font-medium tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                addActivity({ kind: "invoice", text: `Подготовил черновик формы 910 за ${t.periodLabel}`, href: "/accounting?tab=taxes" });
                toast.success("Черновик сохранён", { description: "Отправка в кабинет налогоплательщика — после вашей подписи ЭЦП (демо)" });
              }}
            >
              Сохранить черновик
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
