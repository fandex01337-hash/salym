"use client";

import { Check, Languages } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AGENT_LANGS, LANG_IN, type AgentLang } from "@/lib/agent/i18n";
import { cn } from "@/lib/utils";
import { stopSpeaking } from "@/lib/voice";
import { useVoiceStore } from "@/store/voice-store";

function useLangChange() {
  const set = useVoiceStore((s) => s.set);
  return (lang: AgentLang) => {
    if (useVoiceStore.getState().lang === lang) return;
    stopSpeaking();
    set({ lang });
    toast.success(`Агент говорит с клиентами ${LANG_IN[lang]}`, { description: "Чаты, звонки и собеседования переключены. Отчёты для вас — на русском." });
  };
}

/** Кнопка в шапке: язык общения агента с клиентами */
export function LangSwitch() {
  const lang = useVoiceStore((s) => s.lang);
  const change = useLangChange();
  const current = AGENT_LANGS.find((l) => l.id === lang) ?? AGENT_LANGS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2 font-semibold" aria-label={`Язык агента: ${current.label}`}>
          <Languages className="!size-4" />
          <span className="text-xs tracking-wide">{current.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Язык общения с клиентами</DropdownMenuLabel>
        {AGENT_LANGS.map((l) => (
          <DropdownMenuItem key={l.id} onClick={() => change(l.id)}>
            <span className="w-9 rounded bg-muted px-1 text-center text-[10px] font-bold tracking-wide text-muted-foreground">{l.short}</span>
            <span className="flex-1">
              {l.native}
              {l.id === "ru" && <span className="ml-1 text-xs text-muted-foreground">· по умолчанию</span>}
            </span>
            {l.id === lang && <Check className="text-primary" />}
          </DropdownMenuItem>
        ))}
        <div className="px-2 pb-1.5 pt-1 text-[11px] leading-snug text-muted-foreground">Агент отвечает в чатах, звонках и на собеседованиях на выбранном языке</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Сегментный переключатель языка — для карточек звонка и собеседования */
export function LangSegment({ className }: { className?: string }) {
  const lang = useVoiceStore((s) => s.lang);
  const change = useLangChange();
  return (
    <div className={cn("inline-flex rounded-lg bg-muted p-0.5 text-xs font-semibold", className)} role="radiogroup" aria-label="Язык агента">
      {AGENT_LANGS.map((l) => (
        <button
          key={l.id}
          role="radio"
          aria-checked={l.id === lang}
          onClick={() => change(l.id)}
          className={cn("rounded-md px-2.5 py-1.5 tracking-wide transition", l.id === lang ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
