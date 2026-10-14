"use client";

import { useState } from "react";
import { Pause, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/shared/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Campaign } from "@/lib/data/types";
import { formatMoney, formatNumber } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";

const STATUS: Record<Campaign["status"], { label: string; variant: "success" | "warning" | "secondary" }> = {
  active: { label: "Активна", variant: "success" },
  paused: { label: "Пауза", variant: "warning" },
  finished: { label: "Завершена", variant: "secondary" },
};

export function Campaigns() {
  const data = useData();
  const addCampaign = useAppStore((s) => s.addCampaign);
  const update = useAppStore((s) => s.update);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Акция выходного дня");
  const [channel, setChannel] = useState("Instagram");
  const [budget, setBudget] = useState(50000);

  const totals = data.campaigns.reduce((s, c) => ({ spent: s.spent + c.spent, leads: s.leads + c.leads, reach: s.reach + c.reach }), { spent: 0, leads: 0, reach: 0 });
  const best = [...data.campaigns].filter((c) => c.leads).sort((a, b) => a.spent / a.leads - b.spent / b.leads)[0];

  const toggle = (c: Campaign) => {
    const next = c.status === "active" ? "paused" : "active";
    update((d) => {
      d.campaigns = d.campaigns.map((x) => (x.id === c.id ? { ...x, status: next } : x));
    });
    toast(next === "active" ? "Кампания возобновлена" : "Кампания на паузе", { description: c.name });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Потрачено" value={formatMoney(totals.spent)} />
        <KpiCard label="Охват" value={formatNumber(totals.reach)} />
        <KpiCard label="Заявок из рекламы" value={totals.leads} />
        <KpiCard label="Средняя цена заявки" value={formatMoney(totals.leads ? totals.spent / totals.leads : 0)} hint={best ? `лучшая: ${best.channel}` : undefined} accent />
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <div className="text-[15px] font-semibold">Рекламные кампании</div>
            <div className="text-xs text-muted-foreground">Заявки из рекламы автоматически попадают в инбокс и воронку</div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> Новая кампания
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-medium">Кампания</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 text-right font-medium">Бюджет</th>
                <th className="px-3 py-2 text-right font-medium">Охват</th>
                <th className="px-3 py-2 text-right font-medium">Клики</th>
                <th className="px-3 py-2 text-right font-medium">Заявки</th>
                <th className="px-3 py-2 text-right font-medium">Цена заявки</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-5 py-2.5">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.channel}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                    <div>{formatMoney(c.spent)}</div>
                    <div className="text-[11px] text-muted-foreground">из {formatMoney(c.budget)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(c.reach)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(c.clicks)}</td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">{c.leads}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{c.leads ? formatMoney(c.spent / c.leads) : "—"}</td>
                  <td className="px-5 py-2.5 text-right">
                    {c.status !== "finished" && (
                      <Button size="icon-sm" variant="ghost" onClick={() => toggle(c)} aria-label="Пауза/запуск">
                        {c.status === "active" ? <Pause /> : <Play />}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая кампания</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Название</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Канал</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Instagram", "2ГИС", "OLX", "WhatsApp", "Kaspi"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Бюджет, ₸</Label>
                <Input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value) || 0)} />
              </div>
            </div>
            <p className="rounded-lg bg-ai/5 p-3 text-xs text-muted-foreground">
              Агент подберёт аудиторию (Тараз, 18–45 лет), подготовит креативы и будет отвечать на заявки из рекламы. Прогноз: {Math.max(3, Math.round(budget / 2600))} заявок.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="ai"
              onClick={() => {
                addCampaign({ name, channel, status: "active", budget, spent: 0, reach: 0, clicks: 0, leads: 0, start: new Date().toISOString() });
                setOpen(false);
                toast.success("Кампания запущена", { description: `${name} · ${channel} · ${formatMoney(budget)}` });
              }}
            >
              Запустить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
