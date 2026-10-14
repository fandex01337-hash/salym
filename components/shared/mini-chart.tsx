"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartSpec } from "@/lib/agent/assistant";
import { formatCompactMoney, formatMoney } from "@/lib/utils";

export const CHART_COLORS = ["hsl(250 78% 60%)", "hsl(200 85% 50%)", "hsl(160 60% 42%)", "hsl(35 92% 52%)", "hsl(340 75% 58%)", "hsl(280 60% 60%)", "hsl(190 60% 45%)"];

export const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 8px 24px -12px rgba(0,0,0,.25)",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))", marginBottom: 4 },
  itemStyle: { color: "hsl(var(--foreground))", padding: 0 },
  cursor: { fill: "hsl(var(--muted))", opacity: 0.6 },
};

const isMoney = (spec: ChartSpec) => !spec.title.toLowerCase().includes("этап");

export function MiniChart({ spec, height = 180 }: { spec: ChartSpec; height?: number }) {
  const money = isMoney(spec);
  const fmt = (v: number) => (money ? formatMoney(v) : String(v));
  return (
    <div className="rounded-lg border bg-background/60 p-3 animate-fade-in-up">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{spec.title}</p>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {spec.kind === "pie" ? (
            <PieChart>
              <Pie data={spec.data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
                {spec.data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v: number) => fmt(v)} />
            </PieChart>
          ) : (
            <BarChart data={spec.data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" interval={0} tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 11) + "…" : v)} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={money ? 64 : 28} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => (money ? formatCompactMoney(v).replace(" ₸", "") : String(v))} />
              <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [fmt(v), n === "value2" ? spec.labels?.[1] ?? "" : spec.labels?.[0] ?? "Значение"]} />
              {spec.kind === "compare" && <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => (v === "value2" ? spec.labels?.[1] : spec.labels?.[0])} />}
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {spec.data.map((_, i) => (
                  <Cell key={i} fill={spec.kind === "compare" ? CHART_COLORS[0] : CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
              {spec.kind === "compare" && <Bar dataKey="value2" radius={[4, 4, 0, 0]} maxBarSize={36} fill="hsl(var(--muted-foreground) / 0.35)" />}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
