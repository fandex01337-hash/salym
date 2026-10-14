"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, WEEKDAYS_NOM } from "@/lib/utils";
import { useData } from "@/store/app-store";
import { AgentToday } from "./activity-feed";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export function DashboardHeader() {
  const data = useData();
  const now = new Date();
  const weekday = WEEKDAYS_NOM[now.getDay()];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-xl">
          {greeting()}, {data.owner.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Сегодня {formatDate(now)}, {weekday}. <span className="hidden sm:inline">Вот что происходит в «{data.name.replace(/^.*«|»$/g, "")}».</span>
        </p>
      </div>
      <Button asChild variant="ai" className="h-10 sm:h-9">
        <Link href="/inbox?simulate=1">
          <Zap /> Симулировать заявку
        </Link>
      </Button>
    </div>
  );
}

export function ActivityFeedSection() {
  return <AgentToday />;
}
