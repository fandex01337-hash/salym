"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { AgentAvatar, AiBadge } from "@/components/shared/ai-bits";
import { Hologram } from "@/components/shared/hologram";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { LangSegment } from "@/components/layout/lang-switch";
import { localized } from "@/lib/agent/i18n";
import { pickNewClientName, randomPhone } from "@/lib/data/generator";
import { PROFILES } from "@/lib/data/profiles";
import type { TranscriptLine } from "@/lib/data/types";
import { useAgentVoices } from "@/lib/use-voices";
import { cn, formatDuration, sleep } from "@/lib/utils";
import { speak, stopSpeaking, type SpeakHandle } from "@/lib/voice";
import { useAppStore, useData } from "@/store/app-store";
import { AvatarSegment, VoiceQuickControl } from "./voice-picker";
import { useVoiceStore } from "@/store/voice-store";

const BARS = 36;

function Waveform({ active, who }: { active: boolean; who: "ai" | "client" | null }) {
  return (
    <div className="flex h-14 items-center justify-center gap-[3px]">
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
  const voices = useAgentVoices();
  const avatar = useVoiceStore((s) => s.avatar);
  const voicesRef = useRef(voices);
  voicesRef.current = voices;
  const [state, setState] = useState<"idle" | "ringing" | "talking" | "done">("idle");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [partial, setPartial] = useState<TranscriptLine | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [caller, setCaller] = useState({ name: "", phone: "" });
  const [pulse, setPulse] = useState(0);
  const runRef = useRef(0);
  const callerRef = useRef({ name: "", phone: "" });
  const startedRef = useRef(0);
  const handleRef = useRef<SpeakHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state !== "talking") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, partial]);

  // Уход со страницы — прекращаем разговор и речь
  useEffect(
    () => () => {
      runRef.current++;
      stopSpeaking();
    },
    [],
  );

  // Автозапуск из командной палитры
  useEffect(() => {
    if (!autoStart) return;
    const t = setTimeout(() => void start(), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  /** Реплика: голосом (если включён) или «печатью» по словам */
  const sayLine = async (line: TranscriptLine, run: number) => {
    const words = line.text.split(/\s+/).filter(Boolean);
    const v = voicesRef.current;
    const voiced = v.enabled && (line.who === "ai" || v.voiceOthers);
    const show = (n: number) => {
      if (runRef.current !== run) return;
      setPartial({ who: line.who, text: words.slice(0, n).join(" ") });
      if (line.who === "ai") setPulse((p) => p + 1);
    };
    if (voiced) {
      show(0);
      const resolved = line.who === "ai" ? v.agent : v.other(callerRef.current.name);
      const h = speak(line.text, resolved, show);
      handleRef.current = h;
      await h.done;
      handleRef.current = null;
    } else {
      for (let w = 1; w <= words.length; w++) {
        if (runRef.current !== run) return;
        show(w);
        await sleep(line.who === "ai" ? 120 : 150);
      }
    }
  };

  const start = async () => {
    stopSpeaking();
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
    // Сценарий разговора — на выбранном языке общения агента
    const script = localized(voicesRef.current.lang, data.type)?.liveCall ?? PROFILES[data.type].liveCall;
    for (const line of script) {
      await sayLine(line, run);
      if (runRef.current !== run) return;
      setPartial(null);
      setLines((prev) => [...prev, line]);
      await sleep(voicesRef.current.enabled ? 350 : 700);
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
    handleRef.current?.cancel();
    stopSpeaking();
    setPartial(null);
    if (state === "talking" && lines.length) finish(caller.name, lines);
    else setState("idle");
  };

  const speaking = partial?.who ?? null;
  const live = state === "talking" || state === "ringing";
  const statusText = state === "idle" ? "Линия свободна" : state === "ringing" ? "Входящий звонок…" : state === "talking" ? "Идёт разговор" : "Звонок завершён";

  return (
    <div className="grid gap-4 xl:grid-cols-[440px_1fr]">
      <Card className="overflow-hidden">
        <div className="relative">
          <Hologram speaking={speaking === "ai"} pulse={pulse} active={live} height={320} persona={avatar === "robot" ? "robot" : voices.preset.gender} className="rounded-none" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            <span className={cn("h-1.5 w-1.5 rounded-full", state === "talking" ? "animate-pulse bg-red-500" : state === "ringing" ? "animate-pulse bg-emerald-400" : "bg-white/50")} />
            {statusText}
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-cyan-200 backdrop-blur">
            Салым · {voices.preset.name}
          </div>
          <div className="absolute inset-x-0 bottom-3 text-center text-xs font-medium tracking-wide text-cyan-100/90">
            {speaking === "ai" ? "Агент говорит" : speaking === "client" ? "Агент слушает клиента" : state === "talking" ? "…" : state === "ringing" ? "Агент поднимает трубку" : "Голограмма ИИ-агента"}
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              {state === "ringing" && <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-pulse-ring" />}
              {caller.name ? <Avatar name={caller.name} size={46} /> : <AgentAvatar size={46} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{caller.name || "Ожидание звонка"}</div>
              <div className="text-sm text-muted-foreground">{caller.phone || data.knowledge.phone}</div>
            </div>
            <div className="font-mono text-2xl tabular-nums">{formatDuration(seconds)}</div>
          </div>

          <Waveform active={state === "talking" && !!speaking} who={speaking} />

          {live ? (
            <Button variant="destructive" size="lg" className="w-full rounded-full" onClick={hangup}>
              <PhoneOff /> Завершить
            </Button>
          ) : (
            <Button variant="ai" size="lg" className="w-full rounded-full" onClick={start}>
              <Phone /> {state === "done" ? "Ещё один звонок" : "Симулировать звонок"}
            </Button>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">Язык разговора</span>
            <LangSegment />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">Образ голограммы</span>
            <AvatarSegment />
          </div>
          <VoiceQuickControl />
          {voices.supported && voices.voices.length > 0 && voices.lang !== "ru" && !voices.hasLangVoice && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {voices.lang === "kk"
                ? "На устройстве нет казахского голоса — текст читает русский голос. Живой казахский голос (Айгуль, Даулет) есть в Microsoft Edge."
                : "На устройстве нет английского голоса — текст читает другой голос с акцентом. Откройте сайт в Chrome или Edge: там есть английские голоса."}
            </p>
          )}
          {voices.supported && voices.voices.length > 0 && voices.lang === "ru" && !voices.hasRussian && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Русский голос не найден на устройстве — настройте в «Бот → Голос агента».</p>
          )}
        </div>
      </Card>

      <Card className="flex h-[440px] flex-col sm:h-[560px] xl:h-auto xl:min-h-[640px]">
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
          {!lines.length && !partial && (
            <p className="pt-20 text-center text-sm text-muted-foreground">Нажмите «Симулировать звонок» — агент ответит клиенту голосом, а текст появится здесь</p>
          )}
          {[...lines, ...(partial ? [partial] : [])].map((l, i) => (
            <div key={i} className={cn("flex items-start gap-2 animate-fade-in-up", l.who === "client" && "flex-row-reverse")}>
              {l.who === "ai" ? <AgentAvatar size={26} /> : <Avatar name={caller.name || "Клиент"} size={26} />}
              <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed", l.who === "ai" ? "rounded-tl-sm bg-ai/10" : "rounded-tr-sm bg-muted")}>
                <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{l.who === "ai" ? "Салым" : "Клиент"}</div>
                <span className={cn(partial === l && "typing-caret")}>{l.text || " "}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
