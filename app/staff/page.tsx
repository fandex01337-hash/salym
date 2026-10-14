"use client";

import { Clock, Crown, Medal, Star, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AgentAvatar, AiBadge } from "@/components/shared/ai-bits";
import { KpiCard } from "@/components/shared/kpi-card";
import { CHART_COLORS, tooltipStyle } from "@/components/shared/mini-chart";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, Progress } from "@/components/ui/misc";
import { employeeRevenue } from "@/lib/analytics";
import { cn, formatCompactMoney, formatMoney } from "@/lib/utils";
import { useData } from "@/store/app-store";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function StaffPage() {
  const data = useData();
  const rows = data.employees.map((e) => ({ ...e, revenue: employeeRevenue(data, e.id) })).sort((a, b) => b.revenue - a.revenue);
  const servers = rows.filter((r) => r.serves);
  const avgResponse = rows.reduce((s, r) => s + r.responseMin, 0) / rows.length;
  const slow = [...rows].sort((a, b) => b.responseEvening / b.responseMorning - a.responseEvening / a.responseMorning)[0];
  const bestConv = [...rows].sort((a, b) => b.conversion - a.conversion)[0];
  const lowRating = [...rows].sort((a, b) => a.rating - b.rating)[0];
  const agentMsgs = data.conversations.reduce((s, c) => s + c.messages.filter((m) => m.from === "agent").length, 0);
  const humanMsgs = data.conversations.reduce((s, c) => s + c.messages.filter((m) => m.from === "manager").length, 0);
  const agentShare = Math.round((agentMsgs / Math.max(1, agentMsgs + humanMsgs)) * 100);
  const chart = DAYS.map((d, i) => ({ name: d, ...Object.fromEntries(rows.map((r) => [r.name.split(" ")[0], r.activity[i]])) }));
  const maxRev = Math.max(...servers.map((s) => s.revenue), 1);

  const insights = [
    {
      title: `${slow.name.split(" ")[0]} отвечает в ${Math.round(slow.responseEvening / slow.responseMorning)} раза медленнее в вечернюю смену`,
      text: `${slow.responseEvening} мин вечером против ${slow.responseMorning} мин утром. Вечером теряется ~${Math.round(slow.leads * 0.12)} заявок в месяц.`,
      action: "Передать вечерние чаты агенту",
      done: "Агент берёт на себя вечерние ответы с 18:00",
    },
    {
      title: `У ${bestConv.name.split(" ")[0]} лучшая конверсия — ${bestConv.conversion}%`,
      text: "Агент проанализировал её диалоги: она всегда предлагает конкретное время и дополнительную услугу.",
      action: "Сделать скрипт для всех",
      done: "Скрипт добавлен в базу знаний агента",
    },
    {
      title: `Рейтинг ${lowRating.name.split(" ")[0]} — ${lowRating.rating}★, ниже команды`,
      text: "В 2 отзывах клиенты упоминают ожидание. Предлагаю добавить буфер 10 минут между записями.",
      action: "Добавить буфер",
      done: "Буфер 10 минут добавлен в расписание",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Сотрудники" description="Мониторинг команды: скорость ответа, конверсия и выручка — по данным диалогов и бухгалтерии." icon={<Users className="h-4 w-4" />} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="В команде" value={rows.length} icon={<Users />} hint="+ ИИ-агент Салым" />
        <KpiCard label="Средний ответ команды" value={`${avgResponse.toFixed(1)} мин`} icon={<Clock />} hint="агент — 11 сек" />
        <KpiCard label="Лидер по выручке" value={rows[0].name.split(" ")[0]} icon={<Crown />} hint={formatMoney(rows[0].revenue)} />
        <KpiCard label="Сообщений закрыл агент" value={`${agentShare}%`} icon={<TrendingUp />} hint="остальное — менеджеры" accent />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader>
            <CardTitle>Показатели за 30 дней</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Сотрудник</th>
                  <th className="px-3 py-2 text-right font-medium">Заявок</th>
                  <th className="px-3 py-2 text-right font-medium">Ответ (утро / вечер)</th>
                  <th className="px-3 py-2 text-right font-medium">Конверсия</th>
                  <th className="px-3 py-2 text-right font-medium">Выручка</th>
                  <th className="px-5 py-2 text-right font-medium">Рейтинг</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-ai/[0.04]">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <AgentAvatar size={32} />
                      <div>
                        <div className="flex items-center gap-1.5 font-medium">
                          Салым <AiBadge />
                        </div>
                        <div className="text-xs text-muted-foreground">ИИ-сотрудник · 24/7</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{data.conversations.length * 9}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">11 сек / 11 сек</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">—</td>
                  <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">передаёт мастерам</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">4.9</td>
                </tr>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.name} size={32} />
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.role} · {r.shift}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.leads}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {r.responseMorning} / <span className={cn(r.id === slow.id && "font-semibold text-red-600 dark:text-red-400")}>{r.responseEvening}</span> мин
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.conversion}%</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{r.serves ? formatMoney(r.revenue) : "—"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {r.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Рейтинг по выручке</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {servers.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", i === 0 ? "bg-amber-400/20 text-amber-600" : i === 1 ? "bg-zinc-300/40 text-zinc-600 dark:text-zinc-300" : i === 2 ? "bg-orange-400/20 text-orange-600" : "bg-muted text-muted-foreground")}>
                  {i < 3 ? <Medal className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-medium">{s.name}</span>
                    <span className="tabular-nums text-muted-foreground">{formatCompactMoney(s.revenue)}</span>
                  </div>
                  <Progress value={(s.revenue / maxRev) * 100} className="mt-1" indicatorClassName={i === 0 ? "ai-gradient" : undefined} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Активность по дням недели</CardTitle>
            <p className="text-xs text-muted-foreground">Обработанные заявки и клиенты</p>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={30} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {rows.map((r, i) => (
                    <Bar key={r.id} dataKey={r.name.split(" ")[0]} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === rows.length - 1 ? [4, 4, 0, 0] : 0} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Инсайты агента <AiBadge />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((ins) => (
              <div key={ins.title} className="rounded-lg border p-3">
                <p className="text-sm font-semibold leading-snug">{ins.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ins.text}</p>
                <Button size="sm" variant="outline" className="mt-2 h-7" onClick={() => toast.success(ins.done)}>
                  {ins.action}
                </Button>
              </div>
            ))}
            <Badge variant="secondary">Данные: диалоги, воронка, бухгалтерия, отзывы</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
