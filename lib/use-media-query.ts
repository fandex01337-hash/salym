"use client";

import { useEffect, useState } from "react";

/** Медиа-запрос в React. Приложение рендерится только на клиенте (после гидрации стора), поэтому начальное значение читается сразу. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Breakpoints совпадают с Tailwind */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
export const useIsWide = () => useMediaQuery("(min-width: 1280px)");
export const useIsMobile = () => !useMediaQuery("(min-width: 768px)");
