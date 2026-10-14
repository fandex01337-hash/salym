"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  // Провайдеры рендерятся и на сервере — медиазапрос читаем только после монтирования
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const on = () => setIsMobile(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position={isMobile ? "top-center" : "bottom-right"}
      richColors
      closeButton={!isMobile}
      offset={isMobile ? 12 : 20}
      toastOptions={{ classNames: { toast: "!rounded-xl !text-[13px] !shadow-xl", title: "!font-semibold" } }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        {children}
        <ThemedToaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
