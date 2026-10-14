"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tooltipStyle } from "@/components/shared/mini-chart";
import { dailySeries } from "@/lib/analytics";
import { formatCompactMoney, formatMoney } from "@/lib/utils";
import { useData } from "@/store/app-store";

export function RevenueChart({ days = 30, height = 240, showExpense = true }: { days?: number; height?: number; showExpense?: boolean }) {
  const data = useData();
  const rows = dailySeries(data, days);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(250 78% 60%)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(250 78% 60%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(15 85% 58%)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(15 85% 58%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={58} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => formatCompactMoney(v).replace(" ₸", "")} />
          <Tooltip {...tooltipStyle} cursor={{ stroke: "hsl(var(--border))" }} formatter={(v: number, n: string) => [formatMoney(v), n === "income" ? "Доход" : "Расход"]} />
          <Area type="monotone" dataKey="income" stroke="hsl(250 78% 60%)" strokeWidth={2} fill="url(#inc)" />
          {showExpense && <Area type="monotone" dataKey="expense" stroke="hsl(15 85% 58%)" strokeWidth={1.5} fill="url(#exp)" />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
