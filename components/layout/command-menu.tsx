"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowRight, AtSign, Brain, Briefcase, CalendarClock, CalendarDays, CornerDownLeft, FileSpreadsheet, FileText, Kanban, LayoutDashboard,
  Lightbulb, Megaphone, MessagesSquare, Mic, Moon, PhoneCall, Play, Radio, RotateCcw, Search, Sparkles, Users, Wallet, WandSparkles, Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/misc";
import { BUSINESS_TYPES, PROFILES } from "@/lib/data/profiles";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useLiveStore } from "@/store/live-store";
import { BUSINESS_ICONS } from "./business-icons";

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  avatar?: string;
  keywords?: string;
  run: () => void;
}

export function CommandMenu() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const open = useLiveStore((s) => s.commandOpen);
  const setOpen = useLiveStore((s) => s.setCommandOpen);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K" || e.code === "KeyK")) {
        e.preventDefault();
        setOpen(!useLiveStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const go = (href: string) => () => router.push(href);

  const commands = useMemo<Cmd[]>(() => {
    const data = useAppStore.getState().data;
    const base: Cmd[] = [
      // Сценарий демо
      { id: "s1", group: "Сценарий демо", label: "1. Дашборд и «Агент заметил»", icon: LayoutDashboard, run: go("/") },
      { id: "s2", group: "Сценарий демо", label: "2. Входящая заявка из Instagram", icon: Zap, keywords: "симулировать заявка", run: go("/inbox?simulate=1") },
      { id: "s3", group: "Сценарий демо", label: "3. Воронка → «Оплачено» → счёт", icon: Kanban, run: go("/inbox?tab=funnel") },
      { id: "s4", group: "Сценарий демо", label: "4. Агент-бухгалтер: что съело прибыль", icon: Wallet, run: go("/accounting?ask=profit") },
      { id: "s5", group: "Сценарий демо", label: "5. Акция на слабый день → пост", icon: Megaphone, run: go("/marketing?tab=generator&promo=weekday") },
      { id: "s6", group: "Сценарий демо", label: "6. Расширения: живой звонок", icon: PhoneCall, run: go("/calls") },
      // Навигация
      { id: "n-home", group: "Перейти", label: "Главная", icon: LayoutDashboard, keywords: "дашборд kpi", run: go("/") },
      { id: "n-inbox", group: "Перейти", label: "Заявки и чаты", icon: MessagesSquare, keywords: "инбокс диалоги", run: go("/inbox") },
      { id: "n-funnel", group: "Перейти", label: "Воронка продаж", hint: "Заявки", icon: Kanban, keywords: "сделки канбан", run: go("/inbox?tab=funnel") },
      { id: "n-mentions", group: "Перейти", label: "Отзывы и упоминания", hint: "Заявки", icon: AtSign, keywords: "2гис отзывы", run: go("/inbox?tab=mentions") },
      { id: "n-acc", group: "Перейти", label: "Бухгалтерия", icon: Wallet, keywords: "финансы доходы расходы", run: go("/accounting") },
      { id: "n-docs", group: "Перейти", label: "Документы: счета и акты", hint: "Бухгалтерия", icon: FileText, keywords: "счёт акт накладная pdf", run: go("/accounting?tab=documents") },
      { id: "n-tax", group: "Перейти", label: "Налоги и форма 910", hint: "Бухгалтерия", icon: CalendarClock, keywords: "налог календарь", run: go("/accounting?tab=taxes") },
      { id: "n-mkt", group: "Перейти", label: "Умные акции", hint: "Маркетинг", icon: Lightbulb, run: go("/marketing?tab=promos") },
      { id: "n-gen", group: "Перейти", label: "Генератор контента", hint: "Маркетинг", icon: WandSparkles, keywords: "пост instagram сторис", run: go("/marketing?tab=generator") },
      { id: "n-plan", group: "Перейти", label: "Контент-план", hint: "Маркетинг", icon: CalendarDays, run: go("/marketing?tab=plan") },
      { id: "n-reports", group: "Перейти", label: "Отчёты: Excel о заработке", icon: FileSpreadsheet, keywords: "отчёт эксель excel xlsx выгрузка заработок прибыль", run: go("/reports") },
      { id: "n-staff", group: "Перейти", label: "Сотрудники", icon: Users, run: go("/staff") },
      { id: "n-hr", group: "Перейти", label: "HR: кандидаты", icon: Briefcase, keywords: "найм резюме", run: go("/hr") },
      { id: "n-int", group: "Перейти", label: "ИИ-собеседование", hint: "HR", icon: Mic, run: go("/hr?tab=interview") },
      { id: "n-calls", group: "Перейти", label: "Живой звонок", hint: "Звонки", icon: Radio, run: go("/calls") },
      { id: "n-brain", group: "Перейти", label: "Мозг агента", icon: Brain, keywords: "настройки база знаний каналы", run: go("/settings") },
      // Действия
      { id: "a-sim", group: "Действия", label: "Симулировать входящую заявку", icon: Zap, run: go("/inbox?simulate=1") },
      { id: "a-call", group: "Действия", label: "Симулировать звонок", icon: Play, run: go("/calls?call=1") },
      {
        id: "a-theme",
        group: "Действия",
        label: resolvedTheme === "dark" ? "Светлая тема" : "Тёмная тема",
        icon: Moon,
        keywords: "тема оформление",
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
      {
        id: "a-reset",
        group: "Действия",
        label: "Сбросить демо",
        hint: "Ctrl Shift R",
        icon: RotateCcw,
        run: () => {
          useAppStore.getState().resetDemo();
          toast.success("Демо сброшено", { description: "Все данные возвращены в исходное состояние" });
        },
      },
      ...BUSINESS_TYPES.map((t) => ({
        id: `b-${t}`,
        group: "Тип бизнеса",
        label: PROFILES[t].name,
        hint: PROFILES[t].label,
        icon: BUSINESS_ICONS[t],
        run: () => {
          useAppStore.getState().setBusiness(t);
          router.push("/");
          toast.success(`Загружен бизнес: ${PROFILES[t].name}`);
        },
      })),
    ];
    if (data && q.trim().length >= 2) {
      const ql = q.toLowerCase();
      data.clients
        .filter((c) => c.name.toLowerCase().includes(ql))
        .slice(0, 5)
        .forEach((c) => {
          const conv = data.conversations.find((x) => x.clientId === c.id);
          base.unshift({ id: `c-${c.id}`, group: "Клиенты", label: c.name, hint: c.phone, avatar: c.name, run: go(conv ? `/inbox?c=${conv.id}` : "/inbox") });
        });
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, resolvedTheme]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = ql ? commands.filter((c) => c.group === "Клиенты" || `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`.toLowerCase().includes(ql)) : commands.filter((c) => c.group !== "Тип бизнеса");
    if (ql)
      list.push({
        id: "ask",
        group: "Спросить агента",
        label: `Спросить агента: «${q.trim()}»`,
        icon: Sparkles,
        run: () => {
          useLiveStore.getState().setPendingAsk(q.trim());
          router.push("/");
        },
      });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands, q]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (c: Cmd | undefined) => {
    if (!c) return;
    setOpen(false);
    c.run();
  };

  const groups: { name: string; items: { cmd: Cmd; idx: number }[] }[] = [];
  filtered.forEach((cmd, idx) => {
    let g = groups.find((x) => x.name === cmd.group);
    if (!g) groups.push((g = { name: cmd.group, items: [] }));
    g.items.push({ cmd, idx });
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-50 flex max-h-[72vh] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border bg-popover shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Командная палитра</DialogPrimitive.Title>
          <div className="flex items-center gap-2.5 border-b px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(filtered.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  run(filtered[active]);
                }
              }}
              placeholder="Поиск, команда или вопрос агенту…"
              className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">Esc</kbd>
          </div>
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5 scrollbar-thin">
            {groups.map((g) => (
              <div key={g.name} className="mb-1">
                <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">{g.name}</div>
                {g.items.map(({ cmd, idx }) => (
                  <button
                    key={cmd.id}
                    data-idx={idx}
                    onMouseMove={() => setActive(idx)}
                    onClick={() => run(cmd)}
                    className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors", idx === active ? "bg-primary/10 text-foreground" : "text-foreground/90")}
                  >
                    {cmd.avatar ? (
                      <Avatar name={cmd.avatar} size={22} />
                    ) : cmd.icon ? (
                      <span className={cn("flex h-[22px] w-[22px] items-center justify-center rounded-md", cmd.id === "ask" ? "ai-gradient text-white" : "bg-muted text-muted-foreground")}>
                        <cmd.icon className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                    <span className="flex-1 truncate">{cmd.label}</span>
                    {cmd.hint && <span className="shrink-0 text-xs text-muted-foreground">{cmd.hint}</span>}
                    {idx === active && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            ))}
            {!filtered.length && <p className="p-6 text-center text-sm text-muted-foreground">Ничего не найдено</p>}
          </div>
          <div className="hidden items-center gap-4 border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground sm:flex">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-background px-1">↑</kbd>
              <kbd className="rounded border bg-background px-1">↓</kbd> выбор
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-background px-1">
                <CornerDownLeft className="inline h-2.5 w-2.5" />
              </kbd>
              выполнить
            </span>
            <span className="ml-auto">Напишите вопрос — агент ответит на главной</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
