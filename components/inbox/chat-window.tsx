"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, ChevronLeft, Hand, Info, SendHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AgentAvatar, AiBadge, TypingDots } from "@/components/shared/ai-bits";
import { ChannelIcon, CHANNEL_META } from "@/components/shared/channel-icon";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { genericReply } from "@/lib/agent/replies";
import { simulateTyping } from "@/lib/ai";
import { agentReplyToLast } from "@/lib/simulation";
import { cn, formatDate, formatTime, isSameDay } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";
import { useLiveStore } from "@/store/live-store";
import { useVoiceStore } from "@/store/voice-store";
import { ClientCard, TEMP_META } from "./client-card";

function ModeToggle({ mode, onChange }: { mode: "auto" | "manual"; onChange: (m: "auto" | "manual") => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-lg bg-muted p-0.5 text-xs font-medium">
      <button
        onClick={() => onChange("auto")}
        aria-label="Авто"
        className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 transition sm:px-2.5 sm:py-1", mode === "auto" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
      >
        <Bot className={cn("h-3.5 w-3.5", mode === "auto" && "text-ai")} /> <span className="hidden sm:inline">Авто</span>
      </button>
      <button
        onClick={() => onChange("manual")}
        aria-label="Вручную"
        className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 transition sm:px-2.5 sm:py-1", mode === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
      >
        <Hand className={cn("h-3.5 w-3.5", mode === "manual" && "text-amber-500")} /> <span className="hidden sm:inline">Вручную</span>
      </button>
    </div>
  );
}

export function ChatWindow({ convId, onBack, showClientButton }: { convId: string; onBack?: () => void; showClientButton?: boolean }) {
  const data = useData();
  const conv = data.conversations.find((c) => c.id === convId);
  const client = data.clients.find((c) => c.id === conv?.clientId);
  const typing = useLiveStore((s) => s.typing[convId]);
  const setMode = useAppStore((s) => s.setConversationMode);
  const addMessage = useAppStore((s) => s.addMessage);
  const markRead = useAppStore((s) => s.markConversationRead);
  const [input, setInput] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    markRead(convId);
  }, [convId, conv?.messages.length, markRead]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conv?.messages.length, typing, convId]);

  // Поле ввода растёт вместе с текстом
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  if (!conv || !client) return null;
  const T = TEMP_META[client.temperature];

  const changeMode = (m: "auto" | "manual") => {
    if (m === conv.mode) return;
    setMode(conv.id, m);
    if (m === "manual") toast("Вы перехватили диалог", { description: "Агент больше не отвечает этому клиенту, но подсказывает ответы" });
    else {
      toast.success("Агент снова ведёт диалог");
      void agentReplyToLast(conv.id);
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    if (conv.mode === "auto") {
      setMode(conv.id, "manual");
      toast("Диалог переведён в ручной режим", { description: "Вы ответили сами — агент не будет перебивать" });
    }
    addMessage(conv.id, { from: "manager", text });
    setInput("");
  };

  const suggest = async () => {
    const lastClient = [...conv.messages].reverse().find((m) => m.from === "client");
    setSuggesting(true);
    await simulateTyping(genericReply(data, lastClient?.text ?? "", client.name, useVoiceStore.getState().lang), (t) => setInput(t), { speed: 0.5 });
    setSuggesting(false);
    inputRef.current?.focus();
  };

  let lastDay = "";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b px-2 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        {onBack && (
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Назад к диалогам" className="-ml-0.5 shrink-0">
            <ChevronLeft className="!size-5" />
          </Button>
        )}
        <button
          onClick={() => showClientButton && setClientOpen(true)}
          className={cn("flex min-w-0 flex-1 items-center gap-2.5 text-left", !showClientButton && "cursor-default")}
        >
          <div className="relative shrink-0">
            <Avatar name={client.name} size={36} />
            <ChannelIcon id={conv.channel} size={15} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-card" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{client.name}</span>
              <span className={cn("hidden shrink-0 items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-medium sm:inline-flex", T.cls)}>
                <T.icon className="h-2.5 w-2.5" /> {T.label.split(" ")[0]}
              </span>
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {typing !== undefined && typing !== null ? (
                <span className="text-ai">агент печатает…</span>
              ) : (
                <>
                  {CHANNEL_META[conv.channel].label} · {conv.topic}
                </>
              )}
            </div>
          </div>
        </button>
        <ModeToggle mode={conv.mode} onChange={changeMode} />
        {showClientButton && (
          <Button variant="ghost" size="icon-sm" onClick={() => setClientOpen(true)} aria-label="Карточка клиента" className="shrink-0">
            <Info />
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain bg-muted/25 px-3 py-4 scrollbar-thin sm:px-4">
        {conv.messages.map((m) => {
          const day = new Date(m.at).toDateString();
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.from !== "client";
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] text-muted-foreground shadow-sm">{isSameDay(new Date(m.at), new Date()) ? "Сегодня" : formatDate(m.at)}</span>
                </div>
              )}
              <div className={cn("flex items-end gap-2 animate-fade-in-up", mine && "flex-row-reverse")}>
                <div className="hidden sm:block">
                  {m.from === "client" ? <Avatar name={client.name} size={26} /> : m.from === "agent" ? <AgentAvatar size={26} /> : <Avatar name="Менеджер" size={26} />}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed shadow-sm sm:max-w-[72%] sm:text-sm",
                    m.from === "client" ? "rounded-bl-md bg-card" : m.from === "agent" ? "rounded-br-md bg-ai/10 ring-1 ring-ai/20" : "rounded-br-md bg-primary text-primary-foreground",
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  <div className={cn("mt-1 flex items-center justify-end gap-1.5 text-[10px]", m.from === "manager" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.from === "agent" && <AiBadge />}
                    {m.from === "manager" && <span>Менеджер</span>}
                    {formatTime(m.at)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {typing !== undefined && typing !== null && (
          <div className="flex flex-row-reverse items-end gap-2 animate-fade-in-up">
            <div className="hidden sm:block">
              <AgentAvatar size={26} pulse />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ai/10 px-3.5 py-2 text-[14px] leading-relaxed ring-1 ring-ai/20 sm:max-w-[72%] sm:text-sm">
              {typing ? <span className="typing-caret whitespace-pre-wrap">{typing}</span> : <TypingDots />}
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-card p-2.5 sm:p-3">
        {conv.mode === "auto" ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-ai/5 px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-ai" />
            <span>
              Агент отвечает сам<span className="hidden sm:inline">. Напишите — и диалог перейдёт в ручной режим</span>.
            </span>
          </div>
        ) : (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300">
            <span>Ручной режим<span className="hidden sm:inline">: отвечаете вы, агент подскажет</span></span>
            <button onClick={suggest} disabled={suggesting} className="inline-flex shrink-0 items-center gap-1 font-medium text-ai hover:underline disabled:opacity-50">
              <Sparkles className="h-3 w-3" /> Предложить ответ
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={`Ответить в ${CHANNEL_META[conv.channel].label}…`}
            className="min-h-[40px] flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-ring/30 sm:text-sm"
          />
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Отправить" className="h-10 w-10 shrink-0 rounded-xl">
            <SendHorizontal />
          </Button>
        </form>
      </div>

      {showClientButton && (
        <Sheet open={clientOpen} onOpenChange={setClientOpen}>
          <SheetContent side="right" title="Карточка клиента">
            <ClientCard clientId={client.id} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
