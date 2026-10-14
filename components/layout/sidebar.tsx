"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { toast } from "sonner";
import { AgentAvatar } from "@/components/shared/ai-bits";
import { cn, formatRelative } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";
import { NAV_EXTRA, NAV_MAIN, NAV_SETTINGS, type NavItem } from "./nav";

const AUTONOMY_LABEL = { suggest: "только предлагает", confirm: "с подтверждением", auto: "полностью сам" };

function NavLink({ item, badge }: { item: NavItem; badge?: number }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-sidebar-foreground/80 hover:bg-background/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="truncate">{item.label}</span>
      {badge ? <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground">{badge}</span> : null}
    </Link>
  );
}

export function Sidebar() {
  const data = useData();
  const resetDemo = useAppStore((s) => s.resetDemo);
  const clicks = useRef<number[]>([]);
  const unread = data.conversations.reduce((s, c) => s + (c.unread > 0 ? 1 : 0), 0);
  const last = data.activity[0];

  // Скрытый сброс демо: 3 быстрых клика по логотипу
  const onLogoClick = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 800), now];
    if (clicks.current.length >= 3) {
      clicks.current = [];
      resetDemo();
      toast.success("Демо сброшено", { description: "Все данные возвращены в исходное состояние" });
    }
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r bg-sidebar px-3 py-4 md:flex">
      <button onClick={onLogoClick} className="mb-5 flex items-center gap-2.5 px-1.5 text-left" title="Салым">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg ai-gradient text-sm font-bold text-white shadow-sm">С</div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">Салым</div>
          <div className="text-[11px] text-muted-foreground">ИИ-сотрудник для бизнеса</div>
        </div>
      </button>

      <nav className="space-y-0.5">
        {NAV_MAIN.map((i) => (
          <NavLink key={i.href} item={i} badge={i.href === "/inbox" ? unread : undefined} />
        ))}
      </nav>

      <div className="mb-1.5 mt-5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Расширения</div>
      <nav className="space-y-0.5">
        {NAV_EXTRA.map((i) => (
          <NavLink key={i.href} item={i} />
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <NavLink item={NAV_SETTINGS} />
        <Link href={last?.href ?? "/settings"} className="block rounded-xl border bg-background p-3 shadow-sm transition hover:border-primary/30">
          <div className="flex items-center gap-2.5">
            <AgentAvatar size={30} pulse />
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                Салым работает
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="truncate text-[11px] text-muted-foreground">Автономия: {AUTONOMY_LABEL[data.autonomy]}</div>
            </div>
          </div>
          {last && (
            <div key={last.id} className="mt-2.5 border-t pt-2 text-[11px] leading-snug text-muted-foreground animate-fade-in-up">
              <span className="font-medium text-foreground/80">{formatRelative(last.at)}:</span> <span className="line-clamp-2">{last.text}</span>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
