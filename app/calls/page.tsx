"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { History, PhoneCall, Radio, Settings2 } from "lucide-react";
import { BotSettings } from "@/components/calls/bot-settings";
import { CallLog } from "@/components/calls/call-log";
import { LiveCall } from "@/components/calls/live-call";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function CallsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState(params.get("tab") ?? "live");
  const [autoStart] = useState(params.get("call") === "1");

  useEffect(() => {
    if (autoStart) router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader title="Звонки" description="Агент отвечает на звонки голосом, записывает клиентов и ведёт журнал с расшифровками." icon={<PhoneCall className="h-4 w-4" />} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="live" className="flex-1 sm:flex-none">
            <Radio /> Живой звонок
          </TabsTrigger>
          <TabsTrigger value="log" className="flex-1 sm:flex-none">
            <History /> Журнал
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 sm:flex-none">
            <Settings2 /> Бот
          </TabsTrigger>
        </TabsList>
        <TabsContent value="live">
          <LiveCall autoStart={autoStart} />
        </TabsContent>
        <TabsContent value="log">
          <CallLog />
        </TabsContent>
        <TabsContent value="settings">
          <BotSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CallsPage() {
  return (
    <Suspense>
      <CallsInner />
    </Suspense>
  );
}
