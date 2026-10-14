"use client";

import { useLiveStore } from "@/store/live-store";
import { sleep } from "./utils";

/**
 * Слой ИИ с двумя режимами:
 *  • live — если на сервере задан ANTHROPIC_API_KEY или OPENAI_API_KEY, ответы идут через /api/ai (стриминг);
 *  • demo — заранее подготовленный ответ «печатается» по словам. Работает без интернета и без ключа.
 * При любой ошибке live-режима автоматически используется демо-ответ.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  system: string;
  messages: ChatMessage[];
  /** Демо-ответ (используется без ключа и как запасной вариант) */
  fallback: string | (() => string);
  onToken?: (fullText: string) => void;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Скорость демо-печати: множитель задержки */
  speed?: number;
}

let statusPromise: Promise<{ mode: "demo" | "live"; provider: string | null }> | null = null;

export function getAiStatus() {
  // Статическая версия (GitHub Pages) не имеет сервера — сразу демо-режим
  if (!statusPromise && process.env.NEXT_PUBLIC_STATIC_DEMO === "1") {
    useLiveStore.getState().setAi("demo", null);
    statusPromise = Promise.resolve({ mode: "demo" as const, provider: null });
  }
  if (!statusPromise) {
    statusPromise = fetch("/api/ai/status")
      .then((r) => r.json())
      .then((s: { mode: "demo" | "live"; provider: string | null }) => {
        useLiveStore.getState().setAi(s.mode, s.provider);
        return s;
      })
      .catch(() => {
        useLiveStore.getState().setAi("demo", null);
        return { mode: "demo" as const, provider: null };
      });
  }
  return statusPromise;
}

/** Имитация печати: выдаёт текст порциями по словам с естественными паузами */
export async function simulateTyping(text: string, onToken?: (t: string) => void, opts: { speed?: number; signal?: AbortSignal } = {}) {
  const speed = opts.speed ?? 1;
  const parts = text.match(/\S+\s*|\s+/g) ?? [text];
  let acc = "";
  await sleep(250 * speed);
  for (const part of parts) {
    if (opts.signal?.aborted) break;
    acc += part;
    onToken?.(acc);
    const punct = /[.!?…:]\s*$/.test(part) ? 110 : /,\s*$/.test(part) ? 50 : 0;
    const newline = /\n/.test(part) ? 60 : 0;
    await sleep((14 + Math.random() * 26 + punct + newline) * speed);
  }
  return text;
}

export async function streamText(opts: StreamOptions): Promise<string> {
  const fallbackText = typeof opts.fallback === "function" ? opts.fallback() : opts.fallback;
  const status = await getAiStatus();

  if (status.mode === "live") {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: opts.system, messages: opts.messages, maxTokens: opts.maxTokens ?? 1200 }),
        signal: opts.signal,
      });
      if (!res.ok || !res.body) throw new Error(`AI ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        opts.onToken?.(acc);
      }
      if (acc.trim()) return acc.trim();
      throw new Error("empty");
    } catch (e) {
      if (opts.signal?.aborted) return "";
      console.warn("[Салым] Ошибка ИИ, переключаюсь на демо-ответ", e);
    }
  }

  return simulateTyping(fallbackText, opts.onToken, { speed: opts.speed, signal: opts.signal });
}
