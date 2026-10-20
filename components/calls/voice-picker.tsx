"use client";

import { useState } from "react";
import { AlertTriangle, Check, Play, Square, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentVoices } from "@/lib/use-voices";
import { cn } from "@/lib/utils";
import { VOICE_PRESETS, getPreset, isNatural, resolveVoice, russianVoices, shortVoiceName, speak, stopSpeaking, voiceGender, voicesFor } from "@/lib/voice";
import { useAppStore } from "@/store/app-store";
import { useVoiceStore } from "@/store/voice-store";

const SAMPLES = {
  ru: (name: string) => `Здравствуйте! Меня зовут Салым, голос ${name}. Чем могу помочь?`,
  kk: (name: string) => `Сәлеметсіз бе! Менің атым Салым, дауысым — ${name}. Сізге қалай көмектесе аламын?`,
  en: (name: string) => `Hello! My name is Salym, voice ${name}. How can I help you?`,
};

/** Компактный выбор голоса + вкл/выкл звука — для звонка и собеседования */
export function VoiceQuickControl({ className }: { className?: string }) {
  const { presetId, enabled, set } = useVoiceStore();
  const { supported } = useAgentVoices();
  const setKnowledge = useAppStore((s) => s.setKnowledge);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={presetId}
        onValueChange={(id) => {
          set({ presetId: id, voiceURI: null });
          const p = getPreset(id);
          setKnowledge({ voice: `${p.name} (${p.desc})` });
        }}
      >
        <SelectTrigger className="h-9 min-w-0 flex-1" aria-label="Голос агента">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VOICE_PRESETS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name} · {p.desc}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={enabled && supported ? "secondary" : "outline"}
            size="icon"
            disabled={!supported}
            onClick={() => {
              if (enabled) stopSpeaking();
              set({ enabled: !enabled });
            }}
            aria-label={enabled ? "Выключить звук" : "Включить звук"}
          >
            {enabled && supported ? <Volume2 /> : <VolumeX />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{!supported ? "Браузер не поддерживает синтез речи" : enabled ? "Голос включён" : "Голос выключен"}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Образ голограммы: робот или человек (пол — по выбранному голосу) */
export function AvatarSegment({ className }: { className?: string }) {
  const avatar = useVoiceStore((s) => s.avatar);
  const set = useVoiceStore((s) => s.set);
  const options = [
    { id: "robot" as const, label: "Робот" },
    { id: "human" as const, label: "Человек" },
  ];
  return (
    <div className={cn("inline-flex rounded-lg bg-muted p-0.5 text-xs font-semibold", className)} role="radiogroup" aria-label="Образ голограммы">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={avatar === o.id}
          onClick={() => set({ avatar: o.id })}
          className={cn("rounded-md px-2.5 py-1.5 transition", avatar === o.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Полный выбор голоса в настройках бота */
export function VoicePicker() {
  const { presetId, voiceURI, rate, enabled, voiceOthers, set } = useVoiceStore();
  const { voices, supported, hasRussian, hasNatural, agent, lang } = useAgentVoices();
  const setKnowledge = useAppStore((s) => s.setKnowledge);
  const [playing, setPlaying] = useState<string | null>(null);
  // Голоса для текущего языка общения (для казахского без своих голосов — русские)
  const langVoices = voicesFor(voices, lang);
  const ru = langVoices.length ? langVoices : russianVoices(voices);

  const preview = async (id: string) => {
    stopSpeaking();
    if (playing === id) {
      setPlaying(null);
      return;
    }
    const p = getPreset(id);
    const v = resolveVoice(voices, p.gender, { pitch: p.pitch, rate: p.rate * rate, voiceURI: id === presetId ? voiceURI : null, prefer: p.prefer, lang });
    setPlaying(id);
    await speak(SAMPLES[lang](p.name), v).done;
    setPlaying((cur) => (cur === id ? null : cur));
  };

  const choose = (id: string) => {
    const p = getPreset(id);
    set({ presetId: id, voiceURI: null });
    setKnowledge({ voice: `${p.name} (${p.desc})` });
  };

  if (!supported) {
    return (
      <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" /> Этот браузер не поддерживает синтез речи. Откройте демо в Chrome, Edge или Safari.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {VOICE_PRESETS.map((p) => {
          const active = p.id === presetId;
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => choose(p.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && choose(p.id)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition hover:border-primary/40", active && "border-primary bg-primary/5 ring-2 ring-primary/20")}
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", p.gender === "female" ? "bg-gradient-to-br from-fuchsia-500 to-violet-600" : "bg-gradient-to-br from-sky-500 to-indigo-600")}>
                {p.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  {p.name} {active && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className="truncate text-xs text-muted-foreground">{p.desc}</div>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  void preview(p.id);
                }}
                aria-label={`Прослушать голос ${p.name}`}
              >
                {playing === p.id ? <Square className="!size-3.5" /> : <Play />}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Системный голос</Label>
          <Select value={voiceURI ?? "auto"} onValueChange={(v) => set({ voiceURI: v === "auto" ? null : v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Авто — {agent.voice ? `${shortVoiceName(agent.voice)}${agent.natural ? " · нейро" : ""}` : "по умолчанию"}</SelectItem>
              {ru.map((v) => (
                <SelectItem key={v.voiceURI} value={v.voiceURI}>
                  {shortVoiceName(v)} {isNatural(v) ? "· нейро ★" : ""} {voiceGender(v) === "female" ? "· жен." : voiceGender(v) === "male" ? "· муж." : ""} {v.localService || isNatural(v) ? "" : "· онлайн"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Скорость речи: {rate.toFixed(2).replace(".", ",")}×</Label>
          <input type="range" min={0.8} max={1.3} step={0.05} value={rate} onChange={(e) => set({ rate: Number(e.target.value) })} className="mt-2 w-full accent-[hsl(var(--primary))]" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <span>Озвучивать агента в звонках и собеседованиях</span>
          <Switch checked={enabled} onCheckedChange={(v) => (v ? set({ enabled: v }) : (stopSpeaking(), set({ enabled: v })))} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <span>Озвучивать клиента и кандидата другим голосом (демо)</span>
          <Switch checked={voiceOthers} onCheckedChange={(v) => set({ voiceOthers: v })} />
        </div>
      </div>

      {!hasRussian && voices.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          На устройстве нет русского голоса — речь может звучать с акцентом. В Windows: Параметры → Время и язык → Речь → «Добавить голоса» → Русский.
        </div>
      )}
      {hasRussian && !hasNatural && (
        <div className="flex gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-800 dark:text-sky-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Сейчас доступны только системные голоса — они звучат роботизированно. Самый живой голос с правильными ударениями — нейроголоса{" "}
            <b>Светлана, Дария и Дмитрий</b> в браузере <b>Microsoft Edge</b> (нужен интернет). В Chrome лучший вариант — «Google русский».
          </span>
        </div>
      )}
      {agent.natural && <p className="text-xs text-emerald-600 dark:text-emerald-400">Используется нейроголос {shortVoiceName(agent.voice!)} — максимально естественное звучание.</p>}
      {agent.emulated && hasRussian && (
        <p className="text-xs text-muted-foreground">На этом устройстве один русский голос — разные персонажи различаются высотой и темпом.</p>
      )}
    </div>
  );
}
