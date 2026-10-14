"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { answerQuestion, type ChartSpec } from "@/lib/agent/assistant";
import { agentPersona } from "@/lib/agent/context";
import { streamText, type ChatMessage } from "@/lib/ai";
import { cn, uid } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { AgentAvatar, TypingDots } from "./ai-bits";
import { MiniChart } from "./mini-chart";

interface Turn {
  id: string;
  role: "user" | "assistant";
  text: string;
  chart?: ChartSpec;
  streaming?: boolean;
}

export function AgentChat({
  suggestions,
  placeholder = "Спросите агента о вашем бизнесе…",
  rolePrompt = "",
  compact = false,
  autoAsk,
  autoAskId,
  className,
  greeting,
}: {
  suggestions: string[];
  placeholder?: string;
  rolePrompt?: string;
  compact?: boolean;
  autoAsk?: string | null;
  /** Позволяет задать тот же автоматический вопрос повторно */
  autoAskId?: number;
  className?: string;
  greeting?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef<string | null>(null);

  const ask = async (question: string) => {
    const q = question.trim();
    const data = useAppStore.getState().data;
    if (!q || busy || !data) return;
    setInput("");
    setBusy(true);
    const answer = answerQuestion(data, q);
    const userTurn: Turn = { id: uid("t"), role: "user", text: q };
    const botId = uid("t");
    const history: ChatMessage[] = [...turns, userTurn].slice(-8).map((t) => ({ role: t.role, content: t.text }));
    setTurns((prev) => [...(compact ? [] : prev), userTurn, { id: botId, role: "assistant", text: "", streaming: true }]);

    const text = await streamText({
      system: `${agentPersona(data)}\n\n${rolePrompt}`,
      messages: history,
      fallback: answer.text,
      maxTokens: 700,
      onToken: (t) => setTurns((prev) => prev.map((x) => (x.id === botId ? { ...x, text: t } : x))),
    });
    setTurns((prev) => prev.map((x) => (x.id === botId ? { ...x, text, streaming: false, chart: answer.chart } : x)));
    setBusy(false);
  };

  useEffect(() => {
    const key = `${autoAskId ?? 0}:${autoAsk}`;
    if (!autoAsk || askedRef.current === key) return;
    // Таймер переживает двойной вызов эффектов в StrictMode — вопрос задаётся ровно один раз
    const t = setTimeout(() => {
      askedRef.current = key;
      void ask(autoAsk);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAsk, autoAskId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div ref={scrollRef} className={cn("min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-thin", !compact && "pr-1")}>
        {!turns.length && greeting && (
          <div className="flex gap-2.5">
            <AgentAvatar size={26} />
            <div className="rounded-xl rounded-tl-sm bg-muted px-3 py-2 text-sm">{greeting}</div>
          </div>
        )}
        {turns.map((t) =>
          t.role === "user" ? (
            <div key={t.id} className="flex justify-end animate-fade-in-up">
              <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{t.text}</div>
            </div>
          ) : (
            <div key={t.id} className="flex gap-2.5 animate-fade-in-up">
              <AgentAvatar size={26} pulse={t.streaming} />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="whitespace-pre-wrap rounded-xl rounded-tl-sm bg-muted px-3 py-2 text-sm leading-relaxed">
                  {t.text ? <span className={t.streaming ? "typing-caret" : ""}>{t.text}</span> : <TypingDots />}
                </div>
                {t.chart && <MiniChart spec={t.chart} height={compact ? 150 : 180} />}
              </div>
            </div>
          ),
        )}
      </div>

      <div className={cn("pt-3", !turns.length && compact && "pt-0")}>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => ask(s)}
              className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
          {turns.length > 0 && !busy && (
            <button onClick={() => setTurns([])} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3 w-3" /> Очистить
            </button>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
          className="flex items-center gap-2 rounded-xl border bg-background p-1.5 pl-3 shadow-sm focus-within:ring-2 focus-within:ring-ring/30"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon-sm" variant="ai" disabled={busy || !input.trim()} aria-label="Отправить">
            <ArrowUp />
          </Button>
        </form>
      </div>
    </div>
  );
}
