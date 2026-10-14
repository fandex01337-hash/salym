"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Плавный «набег» числа: с нуля при первом показе и от текущего значения при изменении */
export function CountUp({ value, format = (v) => String(Math.round(v)), duration = 900 }: { value: number; format?: (v: number) => string; duration?: number }) {
  const [shown, setShown] = useState(0);
  const [pop, setPop] = useState(false);
  const shownRef = useRef(0);
  const mountedAt = useRef(0);

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (value - from) * (1 - Math.pow(1 - t, 3));
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Значение изменилось уже после первого показа — подсветим его
    let popTimer: ReturnType<typeof setTimeout> | undefined;
    if (performance.now() - mountedAt.current > 1500) {
      setPop(true);
      popTimer = setTimeout(() => setPop(false), 600);
    }
    // Если вкладка в фоне и rAF не тикает — всё равно показать итог
    const fallback = setTimeout(() => {
      shownRef.current = value;
      setShown(value);
    }, duration + 400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      if (popTimer) clearTimeout(popTimer);
    };
  }, [value, duration]);

  return <span className={cn("inline-block tabular-nums transition-colors", pop && "animate-count-pop text-emerald-600 dark:text-emerald-400")}>{format(shown)}</span>;
}
