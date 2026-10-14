"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/misc";
import { getAiStatus } from "@/lib/ai";
import { useAppStore } from "@/store/app-store";
import { CommandMenu } from "./command-menu";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

function LoadingSkeleton() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-[236px] shrink-0 space-y-3 border-r bg-sidebar p-4 md:block">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const hasData = useAppStore((s) => !!s.data);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    void getAiStatus();
    const done = () => {
      useAppStore.getState().ensureData();
      setHydrated(true);
    };
    if (useAppStore.persist.hasHydrated()) done();
    else return useAppStore.persist.onFinishHydration(done);
  }, []);

  // Сброс демо: Ctrl + Shift + R внутри приложения
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "R" || e.key === "r" || e.code === "KeyR")) {
        e.preventDefault();
        e.stopPropagation();
        resetDemo();
        toast.success("Демо сброшено", { description: "Все данные возвращены в исходное состояние" });
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [resetDemo]);

  // Навигация из мест без роутера (тосты симулятора и т. п.)
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  useEffect(() => {
    const onNav = (e: Event) => {
      const href = (e as CustomEvent<string>).detail;
      // usePathname не содержит basePath — работает и локально, и на GitHub Pages
      if (href === "/inbox?tab=funnel" && pathnameRef.current.replace(/\/$/, "") === "/inbox") window.dispatchEvent(new CustomEvent("salym:open-funnel"));
      else router.push(href);
    };
    window.addEventListener("salym:navigate", onNav);
    return () => window.removeEventListener("salym:navigate", onNav);
  }, [router]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  if (!hydrated || !hasData) return <LoadingSkeleton />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main key={pathname} className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-[calc(76px+env(safe-area-inset-bottom))] pt-4 animate-fade-in-up sm:px-4 md:pb-6 md:pt-5 lg:px-6">
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandMenu />
    </div>
  );
}
