"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AtSign, Kanban, MessagesSquare } from "lucide-react";
import { ChatWindow } from "@/components/inbox/chat-window";
import { ClientCard } from "@/components/inbox/client-card";
import { ConversationList } from "@/components/inbox/conversation-list";
import { FunnelBoard } from "@/components/inbox/funnel-board";
import { Mentions } from "@/components/inbox/mentions";
import { SimulateButton } from "@/components/inbox/simulate-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Channel } from "@/lib/data/types";
import { simulateIncoming } from "@/lib/simulation";
import { useIsDesktop, useIsWide } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { useData } from "@/store/app-store";

function InboxInner() {
  const data = useData();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const isWide = useIsWide();
  const [tab, setTab] = useState(params.get("tab") ?? "chats");
  const [selected, setSelected] = useState<string | null>(params.get("c") ?? data.conversations[0]?.id ?? null);
  // На телефоне: список ↔ переписка (как в мессенджере)
  const [mobileView, setMobileView] = useState<"list" | "chat">(params.get("c") || params.get("simulate") ? "chat" : "list");
  const simulatedRef = useRef(false);

  const open = (id: string) => {
    setSelected(id);
    setMobileView("chat");
  };

  const simulate = (c?: Channel) => {
    const id = simulateIncoming(c);
    if (id) {
      setTab("chats");
      open(id);
    }
  };

  useEffect(() => {
    if (params.get("simulate") && !simulatedRef.current) {
      simulatedRef.current = true;
      simulate("instagram");
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Переходы из уведомлений/ленты при уже открытой странице
  const qc = params.get("c");
  const qtab = params.get("tab");
  useEffect(() => {
    if (qc) {
      open(qc);
      setTab("chats");
    }
  }, [qc]);
  useEffect(() => {
    if (qtab) setTab(qtab);
  }, [qtab]);

  useEffect(() => {
    const openFunnel = () => setTab("funnel");
    window.addEventListener("salym:open-funnel", openFunnel);
    return () => window.removeEventListener("salym:open-funnel", openFunnel);
  }, []);

  const conv = data.conversations.find((c) => c.id === selected) ?? data.conversations[0];
  const unanswered = data.mentions.filter((m) => !m.answered).length;
  const fullscreenChat = !isDesktop && tab === "chats" && mobileView === "chat" && !!conv;

  return (
    <div>
      {!fullscreenChat && (
        <PageHeader
          title="Заявки и чаты"
          description="Все каналы в одном окне. Агент отвечает за секунды, ведёт сделки и следит за отзывами."
          icon={<MessagesSquare className="h-4 w-4" />}
          actions={<SimulateButton onSimulate={simulate} />}
        />
      )}
      <Tabs value={tab} onValueChange={setTab}>
        {!fullscreenChat && (
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="chats" className="flex-1 sm:flex-none">
              <MessagesSquare /> Диалоги
            </TabsTrigger>
            <TabsTrigger value="funnel" className="flex-1 sm:flex-none">
              <Kanban /> Воронка
            </TabsTrigger>
            <TabsTrigger value="mentions" className="flex-1 sm:flex-none">
              <AtSign /> <span className="hidden min-[400px]:inline">Упоминания</span>
              <span className="min-[400px]:hidden">Отзывы</span>
              {unanswered > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white">{unanswered}</span>}
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="chats" className={cn(fullscreenChat && "mt-0")}>
          <Card
            className={cn(
              "overflow-hidden",
              isDesktop
                ? "grid h-[calc(100dvh-215px)] min-h-[520px] grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr_290px]"
                : fullscreenChat
                  ? "-mx-3 -mt-1 flex h-[calc(100dvh-56px-76px-12px-env(safe-area-inset-bottom))] flex-col rounded-none border-x-0 sm:mx-0 sm:rounded-xl sm:border-x"
                  : "flex h-[calc(100dvh-56px-76px-170px-env(safe-area-inset-bottom))] min-h-[420px] flex-col",
            )}
          >
            {(isDesktop || mobileView === "list") && (
              <div className={cn("flex min-h-0 flex-col", isDesktop && "border-r", !isDesktop && "flex-1")}>
                <ConversationList selectedId={isDesktop ? conv?.id ?? null : null} onSelect={open} />
              </div>
            )}
            {conv && (isDesktop || mobileView === "chat") && (
              <ChatWindow convId={conv.id} onBack={isDesktop ? undefined : () => setMobileView("list")} showClientButton={!isWide} />
            )}
            {isWide && <div className="flex min-h-0 flex-col border-l">{conv && <ClientCard clientId={conv.clientId} />}</div>}
          </Card>
        </TabsContent>
        <TabsContent value="funnel">
          <p className="mb-3 text-sm text-muted-foreground">
            <span className="hidden lg:inline">Перетаскивайте карточки между этапами. </span>
            <span className="lg:hidden">Листайте этапы, удерживайте карточку, чтобы перенести, или нажмите «⋯». </span>
            Агент сам двигает сделки по ходу диалога, а при оплате — выставляет счёт и записывает доход.
          </p>
          <FunnelBoard />
        </TabsContent>
        <TabsContent value="mentions">
          <Mentions />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense>
      <InboxInner />
    </Suspense>
  );
}
