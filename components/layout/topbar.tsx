"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, BellOff, Check, ChevronsUpDown, Moon, Search, Sun } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BUSINESS_TYPES, PROFILES } from "@/lib/data/profiles";
import { cn, formatRelative } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";
import { useLiveStore } from "@/store/live-store";
import { BUSINESS_ICONS } from "./business-icons";
import { LangSwitch } from "./lang-switch";

function BusinessSwitcher() {
  const data = useData();
  const setBusiness = useAppStore((s) => s.setBusiness);
  const router = useRouter();
  const Icon = BUSINESS_ICONS[data.type];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex min-w-0 items-center gap-2.5 rounded-xl border bg-card py-1.5 pl-1.5 pr-2 text-left shadow-sm transition hover:bg-muted/50 sm:pl-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-semibold">{data.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {PROFILES[data.type].label}
              <span className="hidden sm:inline"> · г. {data.city}</span>
            </span>
          </span>
          <ChevronsUpDown className="ml-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Тип бизнеса (демо-данные)</DropdownMenuLabel>
        {BUSINESS_TYPES.map((t) => {
          const I = BUSINESS_ICONS[t];
          return (
            <DropdownMenuItem
              key={t}
              onClick={() => {
                if (t === data.type) return;
                setBusiness(t);
                router.push("/");
                toast.success(`Загружен бизнес: ${PROFILES[t].name}`, { description: "Агент подгрузил клиентов, финансы и историю" });
              }}
            >
              <I className="text-muted-foreground" />
              <div className="flex-1 leading-tight">
                <div className="text-[13px] font-medium">{PROFILES[t].name}</div>
                <div className="text-[11px] text-muted-foreground">{PROFILES[t].label}</div>
              </div>
              {t === data.type && <Check className="text-primary" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[11px] text-muted-foreground">Сброс демо: Ctrl + Shift + R</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Notifications() {
  const data = useData();
  const markRead = useAppStore((s) => s.markNotificationsRead);
  const unread = data.notifications.filter((n) => !n.read).length;
  return (
    <Popover onOpenChange={(open) => !open && unread && markRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Уведомления">
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-background">{unread}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1.5rem)] sm:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Уведомления</span>
          {unread > 0 && (
            <button onClick={markRead} className="text-xs text-primary hover:underline">
              Прочитать все
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin sm:max-h-[380px]">
          {data.notifications.length === 0 && <EmptyState icon={<BellOff className="h-5 w-5" />} title="Уведомлений нет" text="Агент сообщит о новых заявках и важных событиях" />}
          {data.notifications.map((n) => (
            <Link key={n.id} href={n.href ?? "/"} className={cn("flex gap-3 border-b px-4 py-3 text-sm transition last:border-0 hover:bg-muted/50", !n.read && "bg-primary/[0.04]")}>
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(n.at)}</span>
                </span>
                <span className="block text-xs text-muted-foreground">{n.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AgentStatus() {
  const aiMode = useLiveStore((s) => s.aiMode);
  const provider = useLiveStore((s) => s.aiProvider);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-sm lg:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Агент онлайн
          <span className="text-muted-foreground">·</span>
          <span className={cn(aiMode === "live" ? "ai-gradient-text font-semibold" : "text-muted-foreground")}>{aiMode === "live" ? `ИИ: ${provider}` : "демо-режим"}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {aiMode === "live" ? "Ответы генерирует реальная модель через API" : "Ключ ИИ не задан: агент использует заготовленные ответы. Добавьте ANTHROPIC_API_KEY в .env.local"}
      </TooltipContent>
    </Tooltip>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Сменить тему">
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}

function SearchButton() {
  const setOpen = useLiveStore((s) => s.setCommandOpen);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden h-9 w-56 shrink items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:bg-muted md:flex xl:w-72 2xl:w-80"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 truncate text-left">Поиск или вопрос агенту…</span>
        <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Поиск">
        <Search />
      </Button>
    </>
  );
}

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-lg sm:gap-3 sm:px-4 md:h-[60px] lg:px-6">
      <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ai-gradient text-sm font-bold text-white shadow-sm md:hidden" aria-label="Салым">
        С
      </Link>
      <BusinessSwitcher />
      <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
        <SearchButton />
        <AgentStatus />
        <LangSwitch />
        <Notifications />
        <ThemeToggle />
      </div>
    </header>
  );
}
