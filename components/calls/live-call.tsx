"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { AgentAvatar, AiBadge } from "@/components/shared/ai-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { pickNewClientName, randomPhone } from "@/lib/data/generator";
import { PROFILES } from "@/lib/data/profiles";
import type { TranscriptLine } from "@/lib/data/types";
import { cn, formatDuration, sleep } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";

const BARS = 40;

function Waveform({ active, who }: { active: boolean; who: "ai" | "client" | null }) {
  return (
    <div className="flex h-24 items-center justify-center gap-[3px]">
      {Array.from({ length: BARS }).map((_, i) => {
        const center = 1 - Math.abs(i - BARS / 2) / (BARS / 2);
        return (
          <span
            key={i}
            className={cn("w-1.5 origin-center rounded-full transition-colors", who === "client" ? "bg-sky-400" : "ai-gradient", active ? "animate-wave" : "")}
            style={{
              height: `${18 + center * 70}%`,
              animationDelay: `${(i * 73) % 900}ms`,
              animationDuration: `${600 + ((i * 131) % 700)}ms`,
              transform: active ? undefined : "scaleY(0.12)",
              opacity: active ? 1 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
}

export function LiveCall({ autoStart }: { autoStart?: boolean }) {
  const data = useData();
  const addCall = useAppStore((s) => s.addCall);
  const addActivity = useAppStore((s) => s.addActivity);
  const [state, setState] = useState<"idle" | "ringing" | "talking" | "done">("idle");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [partial, setPartial] = useState<TranscriptLine | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [caller, setCaller] = useState({ name: "", phone: "" });
  const runRef = useRef(0);
  const callerRef = useRef({ name: "", phone: "" });
  const startedRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state !== "talking") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, partial]);

  useEffect(() => () => void runRef.current++, []);

  // Автозапуск из командной палитры
  useEffect(() => {
    if (!autoStart) return;
    const t = setTimeout(() => void start(), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const start = async () => {
    const run = ++runRef.current;
    const name = pickNewClientName(data);
    callerRef.current = { name, phone: randomPhone() };
    setCaller(callerRef.current);
    setLines([]);
    setSeconds(0);
    setState("ringing");
    await sleep(1800);
    if (runRef.current !== run) return;
    setState("talking");
    startedRef.current = Date.now();
    const script = PROFILES[data.type].liveCall;
    for (const line of script) {
      const words = line.text.split(" ");
      for (let w = 1; w <= words.length; w++) {
        if (runRef.current !== run) return;
        setPartial({ who: line.who, text: words.slice(0, w).join(" ") });
        await sleep(line.who === "ai" ? 120 : 150);
      }
      setPartial(null);
      setLines((prev) => [...prev, line]);
      await sleep(700);
    }
    if (runRef.current !== run) return;
    finish(name, script);
  };

  const finish = (name: string, transcript: TranscriptLine[]) => {
    setState("done");
    const now = new Date().toISOString();
    addCall({
      clientName: name,
      phone: callerRef.current.phone || randomPhone(),
      direction: "in",
      durationSec: Math.max(Math.round((Date.now() - startedRef.current) / 1000), 20),
      at: now,
      result: "Записан",
      resultKind: "booked",
      sentiment: "positive",
      summary: transcript[transcript.length - 1]?.text ?? "Клиент записан",
      transcript,
    });
    addActivity({ kind: "call", text: `Принял звонок от ${name} и оформил запись — подтверждение отправлено в WhatsApp`, href: "/calls" });
    toast.success("Звонок завершён — клиент записан", { description: "Запись в журнале, подтверждение отправлено в WhatsApp" });
  };

  const hangup = () => {
    runRef.current++;
    setPartial(null);
    if (state === "talking" && lines.length) finish(caller.name, lines);
    else setState("idle");
  };

  const speaking = partial?.who ?? null;

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full ai-gradient opacity-20 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {state === "talking" && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
            {state === "idle" ? "Линия свободна" : state === "ringing" ? "Входящий звонок…" : state === "talking" ? "Идёт разговор" : "Звонок завершён"}
          </div>
          <div className="relative my-4">
            {state === "ringing" && <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-pulse-ring" />}
            {state === "idle" || !caller.name ? <AgentAvatar size={84} pulse={state !== "idle"} /> : <Avatar name={caller.name} size={84} />}
          </div>
          <div className="text-lg font-semibold">{caller.name || "Салым на линии"}</div>
          <div className="text-sm text-muted-foreground">{caller.phone || data.knowledge.phone}</div>
          <div className="mt-2 font-mono text-2xl tabular-nums">{formatDuration(seconds)}</div>
          <Waveform active={state === "talking" && !!speaking} who={speaking} />
          <div className="mb-4 h-5 text-xs text-muted-foreground">
            {speaking === "ai" ? "Говорит ИИ-агент" : speaking === "client" ? "Говорит клиент" : state === "talking" ? "…" : ""}
          </div>
          {state === "talking" || state === "ringing" ? (
            <Button variant="destructive" size="lg" className="rounded-full" onClick={hangup}>
              <PhoneOff /> Завершить
            </Button>
          ) : (
            <Button variant="ai" size="lg" className="rounded-full" onClick={start}>
              <Phone /> {state === "done" ? "Ещё один звонок" : "Симулировать звонок"}
            </Button>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Голос: {data.knowledge.voice}</p>
        </div>
      </Card>

      <Card className="flex h-[440px] flex-col sm:h-[560px]">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            Расшифровка в реальном времени <AiBadge />
          </div>
          {state === "done" && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Клиент записан
            </span>
          )}
        </div>
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 scrollbar-thin">
          {!lines.length && !partial && <p className="pt-20 text-center text-sm text-muted-foreground">Нажмите «Симулировать звонок» — агент ответит клиенту голосом, а текст появится здесь</p>}
          {[...lines, ...(partial ? [partial] : [])].map((l, i) => (
            <div key={i} className={cn("flex items-start gap-2 animate-fade-in-up", l.who === "client" && "flex-row-reverse")}>
              {l.who === "ai" ? <AgentAvatar size={26} /> : <Avatar name={caller.name || "Клиент"} size={26} />}
              <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed", l.who === "ai" ? "rounded-tl-sm bg-ai/10" : "rounded-tr-sm bg-muted")}>
                <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{l.who === "ai" ? "Салым" : "Клиент"}</div>
                <span className={cn(partial === l && "typing-caret")}>{l.text}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
