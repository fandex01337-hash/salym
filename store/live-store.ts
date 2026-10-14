"use client";

import { create } from "zustand";

/** Временное (не сохраняемое) состояние: «агент печатает», подсветки, режим ИИ */
interface LiveState {
  typing: Record<string, string | null>;
  highlightDealId: string | null;
  simulating: boolean;
  aiMode: "unknown" | "demo" | "live";
  aiProvider: string | null;
  /** Вопрос агенту из командной палитры — подхватывает дашборд */
  pendingAsk: { text: string; id: number } | null;
  commandOpen: boolean;
  setPendingAsk: (text: string | null) => void;
  setCommandOpen: (v: boolean) => void;
  setTyping: (convId: string, text: string | null) => void;
  setHighlight: (id: string | null) => void;
  setSimulating: (v: boolean) => void;
  setAi: (mode: "demo" | "live", provider: string | null) => void;
}

export const useLiveStore = create<LiveState>()((set) => ({
  typing: {},
  highlightDealId: null,
  simulating: false,
  aiMode: "unknown",
  aiProvider: null,
  pendingAsk: null,
  commandOpen: false,
  setPendingAsk: (text) => set({ pendingAsk: text ? { text, id: Date.now() } : null }),
  setCommandOpen: (v) => set({ commandOpen: v }),
  setTyping: (convId, text) => set((s) => ({ typing: { ...s.typing, [convId]: text } })),
  setHighlight: (id) => set({ highlightDealId: id }),
  setSimulating: (v) => set({ simulating: v }),
  setAi: (mode, provider) => set({ aiMode: mode, aiProvider: provider }),
}));
