"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, LayoutGrid, LayoutDashboard, Megaphone, MessagesSquare, Wallet } from "lucide-react";
import { AgentAvatar } from "@/components/shared/ai-bits";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useData } from "@/store/app-store";
import { NAV_EXTRA, NAV_SETTINGS } from "./nav";

const TABS = [
  { href: "/", label: "Главная", icon: LayoutDashboard },
  { href: "/inbox", label: "Заявки", icon: MessagesSquare },
  { href: "/accounting", label: "Финансы", icon: Wallet },
  { href: "/marketing", label: "Маркетинг", icon: Megaphone },
];

const AUTONOMY_LABEL = { suggest: "только предлагает", confirm: "с подтверждением", auto: "полностью сам" };

/** Нижняя панель навигации на телефоне — как в нативном приложении */
export function MobileNav() {
  const pathname = usePathname();
  const data = useData();
  const [more, setMore] = useState(false);
  const unread = data.conversations.filter((c) => c.unread > 0).length;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const moreActive = [...NAV_EXTRA, NAV_SETTINGS].some((i) => isActive(i.href));
  const last = data.activity[0];

  useEffect(() => setMore(false), [pathname]);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        <div className="grid h-[60px] grid-cols-5">
          {TABS.map((t) => {
            const active = isActive(t.href);
            return (
              <Link key={t.href} href={t.href} className={cn("relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}>
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full ai-gradient" />}
                <span className="relative">
                  <t.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                  {t.href === "/inbox" && unread > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">{unread}</span>
                  )}
                </span>
                {t.label}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} className={cn("relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium", moreActive ? "text-primary" : "text-muted-foreground")}>
            {moreActive && <span className="absolute top-0 h-0.5 w-8 rounded-full ai-gradient" />}
            <LayoutGrid className="h-[22px] w-[22px]" strokeWidth={moreActive ? 2.2 : 1.8} />
            Ещё
          </button>
        </div>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" title="Навыки агента">
          <div className="space-y-4 px-4 pb-2">
            <Link href="/settings" className="flex items-center gap-3 rounded-2xl border bg-background p-3.5 shadow-sm">
              <AgentAvatar size={40} pulse />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Салым работает</div>
                <div className="truncate text-xs text-muted-foreground">{last ? last.text : `Автономия: ${AUTONOMY_LABEL[data.autonomy]}`}</div>
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-2.5">
              {[...NAV_EXTRA, NAV_SETTINGS].map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  className={cn("flex items-center gap-3 rounded-2xl border p-3.5 transition active:scale-[0.98]", isActive(i.href) ? "border-primary/40 bg-primary/5" : "bg-background")}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <i.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1 text-sm font-medium leading-tight">{i.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
            <p className="text-center text-[11px] text-muted-foreground">Салым · один агент — все навыки бизнеса</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
