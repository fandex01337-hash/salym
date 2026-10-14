"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { ActivityFeedSection, DashboardHeader } from "@/components/dashboard/header";
import { AgentFlow } from "@/components/dashboard/agent-flow";
import { Insights } from "@/components/dashboard/insights";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { AgentAvatar } from "@/components/shared/ai-bits";
import { AgentChat } from "@/components/shared/agent-chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUGGESTED_QUESTIONS } from "@/lib/agent/assistant";
import { useLiveStore } from "@/store/live-store";

export default function DashboardPage() {
  const pending = useLiveStore((s) => s.pendingAsk);
  const setPending = useLiveStore((s) => s.setPendingAsk);

  // Вопрос из командной палитры передаётся один раз и очищается
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), 1500);
    return () => clearTimeout(t);
  }, [pending, setPending]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <DashboardHeader />
      <KpiRow />
      <AgentFlow />
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="space-y-3 sm:space-y-4 lg:col-span-2">
          <Card className="ai-glow">
            <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
              <AgentAvatar size={30} pulse />
              <div className="min-w-0">
                <CardTitle>Спроси агента</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Агент видит заявки, финансы, маркетинг и команду — спросите что угодно о бизнесе</p>
              </div>
            </CardHeader>
            <CardContent>
              <AgentChat compact suggestions={SUGGESTED_QUESTIONS} className="max-h-[520px]" autoAsk={pending?.text} autoAskId={pending?.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Доходы и расходы</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Последние 30 дней · данные из бухгалтерии</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/accounting">
                  <span className="hidden sm:inline">Бухгалтерия</span> <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-2 sm:px-5">
              <RevenueChart />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <Insights />
          <ActivityFeedSection />
        </div>
      </div>
    </div>
  );
}
