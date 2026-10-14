"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, FileText, LayoutGrid, Sparkles, Wallet } from "lucide-react";
import { AccountingOverview } from "@/components/accounting/overview";
import { Documents } from "@/components/accounting/documents";
import { Taxes } from "@/components/accounting/taxes";
import { AgentAvatar } from "@/components/shared/ai-bits";
import { AgentChat } from "@/components/shared/agent-chat";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lastMonthQuestion } from "@/lib/agent/assistant";
import { useIsWide } from "@/lib/use-media-query";

const BOOKKEEPER_PROMPT =
  "Сейчас ты работаешь как бухгалтер. Отвечай про деньги: доходы, расходы, прибыль, налоги. Давай 2–3 конкретных совета, как улучшить прибыль.";

function Bookkeeper({ ask, className }: { ask: string | null; className?: string }) {
  return (
    <AgentChat
      className={className}
      rolePrompt={BOOKKEEPER_PROMPT}
      autoAsk={ask}
      greeting="Сәлем! Я веду учёт по каждой оплате. Спросите, сколько вы заработали, что съело прибыль или сколько платить налогов."
      suggestions={["Что съело прибыль в этом месяце?", lastMonthQuestion(), "Сколько налога платить?"]}
      placeholder="Спросите бухгалтера…"
    />
  );
}

function AccountingInner() {
  const params = useSearchParams();
  const isWide = useIsWide();
  const ask = params.get("ask") === "profit" ? "Что съело прибыль в этом месяце?" : null;
  const qtab = params.get("tab");
  const doc = params.get("doc");
  // На узких экранах агент-бухгалтер — отдельная вкладка, на широких — панель справа
  const [tab, setTab] = useState(qtab ?? (ask && !isWide ? "assistant" : "overview"));

  useEffect(() => {
    if (qtab) setTab(qtab);
  }, [qtab, doc]);
  useEffect(() => {
    if (isWide && tab === "assistant") setTab("overview");
  }, [isWide, tab]);

  return (
    <div>
      <PageHeader title="Бухгалтерия" description="Доходы, расходы, документы и налоги — агент ведёт учёт сам по каждой оплате." icon={<Wallet className="h-4 w-4" />} />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_400px]">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <TabsList className="w-full overflow-x-auto sm:w-auto">
            <TabsTrigger value="overview" className="flex-1 sm:flex-none">
              <LayoutGrid /> Обзор
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-1 sm:flex-none">
              <FileText /> Документы
            </TabsTrigger>
            <TabsTrigger value="taxes" className="flex-1 sm:flex-none">
              <CalendarClock /> Налоги
            </TabsTrigger>
            {!isWide && (
              <TabsTrigger value="assistant" className="flex-1 sm:flex-none">
                <Sparkles className="text-ai" /> Бухгалтер
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="overview">
            <AccountingOverview />
          </TabsContent>
          <TabsContent value="documents">
            <Documents initialDocId={doc} />
          </TabsContent>
          <TabsContent value="taxes">
            <Taxes />
          </TabsContent>
          {!isWide && (
            <TabsContent value="assistant">
              <Card className="ai-glow">
                <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
                  <AgentAvatar size={30} pulse />
                  <div>
                    <CardTitle>Агент-бухгалтер</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Ответит с цифрами и графиком</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <Bookkeeper ask={ask} className="h-[calc(100dvh-330px)] min-h-[420px]" />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {isWide && (
          <Card className="sticky top-[76px] flex h-fit max-h-[calc(100dvh-96px)] flex-col">
            <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
              <AgentAvatar size={30} pulse />
              <div>
                <CardTitle>Агент-бухгалтер</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Ответит с цифрами и графиком</p>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col">
              <Bookkeeper ask={ask} className="min-h-[440px] flex-1" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AccountingPage() {
  return (
    <Suspense>
      <AccountingInner />
    </Suspense>
  );
}
