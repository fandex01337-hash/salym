"use client";

import Link from "next/link";
import { ChevronRight, FileText, Kanban, Lightbulb, MessageCircle, Users, Wallet, type LucideIcon } from "lucide-react";
import { AiBadge } from "@/components/shared/ai-bits";
import { CountUp } from "@/components/shared/count-up";
import { Card } from "@/components/ui/card";
import { periodTotals, todayStats } from "@/lib/analytics";
import { formatCompactMoney } from "@/lib/utils";
import { useData } from "@/store/app-store";

interface Step {
  icon: LucideIcon;
  skill: string;
  value: number;
  format?: (v: number) => string;
  caption: string;
  href: string;
  tint: string;
}

/** Главная идея продукта: навыки агента передают данные друг другу */
export function AgentFlow() {
  const data = useData();
  const t = todayStats(data);
  const open = data.deals.filter((d) => ["new", "in_progress", "awaiting_payment"].includes(d.stage)).length;
  const invoices = data.documents.filter((d) => d.kind === "invoice" && Date.now() - new Date(d.date).getTime() < 30 * 86400000).length;
  const income = periodTotals(data, 30, 0).income;
  const agentMsgs = data.conversations.reduce((s, c) => s + c.messages.filter((m) => m.from === "agent").length, 0);

  const steps: Step[] = [
    { icon: MessageCircle, skill: "Администратор", value: t.leadsToday, caption: "заявок сегодня", href: "/inbox", tint: "text-sky-600 bg-sky-500/10 dark:text-sky-400" },
    { icon: Kanban, skill: "Продажи", value: open, caption: "сделок в работе", href: "/inbox?tab=funnel", tint: "text-violet-600 bg-violet-500/10 dark:text-violet-400" },
    { icon: FileText, skill: "Документы", value: invoices, caption: "счетов за 30 дней", href: "/accounting?tab=documents", tint: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" },
    { icon: Wallet, skill: "Бухгалтер", value: income, format: formatCompactMoney, caption: "доход учтён", href: "/accounting", tint: "text-teal-600 bg-teal-500/10 dark:text-teal-400" },
    { icon: Lightbulb, skill: "Маркетолог", value: 3, caption: "акции из данных", href: "/marketing?tab=promos", tint: "text-amber-600 bg-amber-500/10 dark:text-amber-400" },
    { icon: Users, skill: "HR-аналитик", value: agentMsgs, caption: "ответов в мониторинге", href: "/staff", tint: "text-pink-600 bg-pink-500/10 dark:text-pink-400" },
  ];

  return (
    <Card className="overflow-hidden p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            Один агент — связанные навыки <AiBadge />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Заявка становится сделкой, сделка — счётом и доходом, данные — акциями и аналитикой команды</p>
        </div>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory items-stretch gap-0 overflow-x-auto px-4 pb-1 scrollbar-thin sm:-mx-5 sm:px-5 xl:mx-0 xl:overflow-visible xl:px-0">
        {steps.map((s, i) => (
          <div key={s.skill} className="flex shrink-0 snap-start items-center xl:flex-1 xl:shrink">
            <Link
              href={s.href}
              className="group flex w-[148px] flex-col rounded-xl border bg-background p-3 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md xl:w-full animate-fade-in-up"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.tint}`}>
                  <s.icon className="h-4 w-4" />
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 transition group-hover:text-muted-foreground" />
              </div>
              <div className="mt-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.skill}</div>
              <div className="text-lg font-semibold leading-tight tabular-nums">
                <CountUp value={s.value} format={s.format} />
              </div>
              <div className="text-[11px] leading-tight text-muted-foreground">{s.caption}</div>
            </Link>
            {i < steps.length - 1 && (
              <div className="relative mx-1 h-px w-6 shrink-0 bg-gradient-to-r from-border via-primary/40 to-border xl:mx-1.5 xl:w-auto xl:min-w-4 xl:flex-[0.25]">
                <span className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ai-gradient animate-flow-dot" style={{ animationDelay: `${i * 0.4}s` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
