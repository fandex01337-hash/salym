"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Lightbulb, Megaphone, Target, WandSparkles } from "lucide-react";
import { Campaigns } from "@/components/marketing/campaigns";
import { ContentPlan } from "@/components/marketing/content-plan";
import { ContentGenerator } from "@/components/marketing/generator";
import { SmartPromos } from "@/components/marketing/promos";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { promoTopic } from "@/lib/agent/content";
import { useData } from "@/store/app-store";

function MarketingInner() {
  const data = useData();
  const params = useSearchParams();
  const qtab = params.get("tab");
  const qpromo = params.get("promo");
  const [tab, setTab] = useState(qtab ?? "promos");
  const [promo, setPromo] = useState<{ topic: string; n: number } | null>(() => {
    const t = promoTopic(data, qpromo);
    return t ? { topic: t, n: 0 } : null;
  });

  useEffect(() => {
    if (qtab) setTab(qtab);
    const t = promoTopic(data, qpromo);
    if (t) setPromo((p) => ({ topic: t, n: (p?.n ?? 0) + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtab, qpromo]);

  const launch = (id: string) => {
    const t = promoTopic(data, id);
    if (!t) return;
    setPromo((p) => ({ topic: t, n: (p?.n ?? 0) + 1 }));
    setTab("generator");
  };

  return (
    <div>
      <PageHeader title="Маркетинг" description="Контент, акции и реклама на основе реальных данных бизнеса." icon={<Megaphone className="h-4 w-4" />} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="promos">
            <Lightbulb /> Умные акции
          </TabsTrigger>
          <TabsTrigger value="generator">
            <WandSparkles /> Генератор
          </TabsTrigger>
          <TabsTrigger value="plan">
            <CalendarDays /> Контент-план
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Target /> Кампании
          </TabsTrigger>
        </TabsList>
        <TabsContent value="promos">
          <SmartPromos onLaunch={launch} />
        </TabsContent>
        <TabsContent value="generator">
          <ContentGenerator key={promo?.n ?? "base"} initialTopic={promo?.topic} autoGenerate={!!promo} />
        </TabsContent>
        <TabsContent value="plan">
          <ContentPlan />
        </TabsContent>
        <TabsContent value="campaigns">
          <Campaigns />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <Suspense>
      <MarketingInner />
    </Suspense>
  );
}
