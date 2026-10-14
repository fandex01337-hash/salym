"use client";

import Link from "next/link";
import { Bell, Briefcase, FileText, Lightbulb, Megaphone, MessageCircle, Phone, Star, Workflow } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { todayStats } from "@/lib/analytics";
import type { ActivityKind } from "@/lib/data/types";
import { cn, formatTime, isSameDay, plural } from "@/lib/utils";
import { useData } from "@/store/app-store";

export const ACTIVITY_ICON: Record<ActivityKind, { icon: typeof Bell; cls: string }> = {
  reply: { icon: MessageCircle, cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  deal: { icon: Workflow, cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  invoice: { icon: FileText, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  post: { icon: Megaphone, cls: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  reminder: { icon: Bell, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  insight: { icon: Lightbulb, cls: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  call: { icon: Phone, cls: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  hr: { icon: Briefcase, cls: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  review: { icon: Star, cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
};

export function AgentToday() {
  const data = useData();
  const t = todayStats(data);
  const now = new Date();
  const items = data.activity.filter((a) => isSameDay(new Date(a.at), now)).slice(0, 12);
  const stats = [
    { n: t.repliedClients, l: plural(t.repliedClients, ["клиенту ответил", "клиентам ответил", "клиентам ответил"]) },
    { n: t.invoicesToday, l: plural(t.invoicesToday, ["счёт выставил", "счёта выставил", "счетов выставил"]) },
    { n: t.postsToday, l: plural(t.postsToday, ["пост опубликовал", "поста опубликовал", "постов опубликовал"]) },
    { n: t.callsToday, l: plural(t.callsToday, ["звонок принял", "звонка принял", "звонков принял"]) },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Что агент сделал сегодня</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.l} className="rounded-lg bg-muted/60 px-2 py-2 text-center">
              <div className="text-lg font-semibold tabular-nums">{s.n}</div>
              <div className="text-[10.5px] leading-tight text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
        <ol className="relative space-y-0.5">
          {items.map((a, i) => {
            const I = ACTIVITY_ICON[a.kind];
            return (
              <li key={a.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <Link href={a.href ?? "/"} className="group flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-muted/60">
                  <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md", I.cls)}>
                    <I.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] leading-snug">{a.text}</span>
                  <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground">{formatTime(a.at)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
