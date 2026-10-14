"use client";

import { ArrowDownRight, ArrowUpRight, Percent, Wallet } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { KpiCard } from "@/components/shared/kpi-card";
import { CHART_COLORS, tooltipStyle } from "@/components/shared/mini-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { expensesByCategory, periodTotals } from "@/lib/analytics";
import { formatCompactMoney, formatMoney } from "@/lib/utils";
import { useData } from "@/store/app-store";
import { TransactionsTable } from "./transactions-table";

export function AccountingOverview() {
  const data = useData();
  const cur = periodTotals(data, 30, 0);
  const prev = periodTotals(data, 60, 30);
  const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);
  const cats = expensesByCategory(data, 30);
  const margin = cur.income ? Math.round((cur.profit / cur.income) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Доходы, 30 дней" value={formatCompactMoney(cur.income)} delta={delta(cur.income, prev.income)} icon={<ArrowUpRight />} hint="к прошлому периоду" />
        <KpiCard label="Расходы, 30 дней" value={formatCompactMoney(cur.expense)} delta={delta(cur.expense, prev.expense)} icon={<ArrowDownRight />} hint="к прошлому периоду" />
        <KpiCard label="Чистая прибыль" value={formatCompactMoney(cur.profit)} delta={delta(cur.profit, prev.profit)} icon={<Wallet />} hint="к прошлому периоду" />
        <KpiCard label="Маржинальность" value={`${margin}%`} icon={<Percent />} hint={`было ${prev.income ? Math.round((prev.profit / prev.income) * 100) : 0}%`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Доходы и расходы по дням</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart height={250} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Структура расходов</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 2xl:flex-row">
            <div className="h-[170px] w-[170px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cats} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                    {cats.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full min-w-0 flex-1 space-y-1.5">
              {cats.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="tabular-nums text-muted-foreground">{formatCompactMoney(c.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <TransactionsTable />
    </div>
  );
}
