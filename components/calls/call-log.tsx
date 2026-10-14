"use client";

import { useEffect, useState } from "react";
import { PhoneIncoming, PhoneMissed, PhoneOutgoing, Pause, Play } from "lucide-react";
import { AgentAvatar, AiBadge } from "@/components/shared/ai-bits";
import { KpiCard } from "@/components/shared/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, Progress } from "@/components/ui/misc";
import type { Call } from "@/lib/data/types";
import { cn, formatDuration, formatRelative, isSameDay } from "@/lib/utils";
import { useData } from "@/store/app-store";

const RESULT: Record<Call["resultKind"], "success" | "info" | "warning" | "danger"> = { booked: "success", info: "info", missed: "warning", complaint: "danger" };

function FakePlayer({ duration }: { duration: number }) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPos((p) => (p + 1 >= duration ? (setPlaying(false), duration) : p + 1)), 1000 / 8);
    return () => clearInterval(t);
  }, [playing, duration]);
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5">
      <Button size="icon-sm" variant="secondary" onClick={() => (pos >= duration ? (setPos(0), setPlaying(true)) : setPlaying((v) => !v))} aria-label="Прослушать">
        {playing ? <Pause /> : <Play />}
      </Button>
      <Progress value={(pos / Math.max(1, duration)) * 100} className="flex-1" />
      <span className="text-xs tabular-nums text-muted-foreground">
        {formatDuration(pos)} / {formatDuration(duration)}
      </span>
    </div>
  );
}

export function CallLog() {
  const data = useData();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = data.calls.find((c) => c.id === openId);
  const today = data.calls.filter((c) => isSameDay(new Date(c.at), new Date())).length;
  const answered = data.calls.filter((c) => c.durationSec > 0);
  const avg = answered.reduce((s, c) => s + c.durationSec, 0) / Math.max(1, answered.length);
  const booked = Math.round((data.calls.filter((c) => c.resultKind === "booked").length / data.calls.length) * 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Звонков сегодня" value={today} hint={`всего ${data.calls.length} за неделю`} />
        <KpiCard label="Средняя длительность" value={formatDuration(Math.round(avg))} />
        <KpiCard label="Закончились записью" value={`${booked}%`} accent />
        <KpiCard label="Пропущенных" value="0" hint="агент перезванивает сам" />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium sm:px-5">Клиент</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Итог</th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">Кратко</th>
              <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Длит.</th>
              <th className="px-4 py-2 text-right font-medium sm:px-5">Когда</th>
            </tr>
          </thead>
          <tbody>
            {data.calls.map((c) => {
              const Icon = c.durationSec === 0 ? PhoneMissed : c.direction === "in" ? PhoneIncoming : PhoneOutgoing;
              return (
                <tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", c.direction === "in" ? "bg-sky-500/10 text-sky-600" : "bg-violet-500/10 text-violet-600")}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-medium">{c.clientName}</div>
                        <div className="text-xs text-muted-foreground">
                          <span className="hidden sm:inline">{c.phone}</span>
                          <span className="sm:hidden">{c.result}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    <Badge variant={RESULT[c.resultKind]}>{c.result}</Badge>
                  </td>
                  <td className="hidden max-w-[360px] px-3 py-2.5 lg:table-cell">
                    <span className="line-clamp-1 text-xs text-muted-foreground">{c.summary}</span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{c.durationSec ? formatDuration(c.durationSec) : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-muted-foreground sm:px-5">{formatRelative(c.at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>Звонок: {open.clientName}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant={RESULT[open.resultKind]}>{open.result}</Badge>
                <Badge variant="outline">{open.direction === "in" ? "Входящий" : "Исходящий"}</Badge>
                <span className="text-muted-foreground">{formatRelative(open.at)}</span>
              </div>
              <div className="rounded-lg bg-ai/5 p-3 text-sm">
                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <AiBadge /> Резюме звонка
                </div>
                {open.summary}
              </div>
              {open.durationSec > 0 && <FakePlayer duration={open.durationSec} />}
              <div className="space-y-2">
                {open.transcript.map((t, i) => (
                  <div key={i} className={cn("flex items-start gap-2", t.who === "client" && "flex-row-reverse")}>
                    {t.who === "ai" ? <AgentAvatar size={24} /> : <Avatar name={open.clientName} size={24} />}
                    <div className={cn("max-w-[80%] rounded-xl px-3 py-1.5 text-sm", t.who === "ai" ? "bg-ai/10" : "bg-muted")}>{t.text}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
