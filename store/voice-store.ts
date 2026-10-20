"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AgentLang } from "@/lib/agent/i18n";

/**
 * Настройки голоса и языка общения агента — это настройки устройства
 * (набор системных голосов у каждого свой), поэтому они хранятся отдельно
 * от данных бизнеса и не сбрасываются вместе с демо.
 */
interface VoiceState {
  enabled: boolean;
  presetId: string;
  /** Конкретный системный голос; null — подобрать автоматически под пресет */
  voiceURI: string | null;
  rate: number;
  /** Озвучивать реплики клиента/кандидата другим голосом */
  voiceOthers: boolean;
  /** Язык, на котором агент говорит с клиентами (по умолчанию русский) */
  lang: AgentLang;
  /** Образ голограммы: робот или человек (мужчина/женщина — по голосу) */
  avatar: "robot" | "human";
  set: (patch: Partial<Omit<VoiceState, "set">>) => void;
}

export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      enabled: true,
      presetId: "aigul",
      voiceURI: null,
      rate: 1,
      voiceOthers: true,
      lang: "ru",
      avatar: "robot",
      set: (patch) => set(patch),
    }),
    { name: "salym-voice-v1", storage: createJSONStorage(() => localStorage) },
  ),
);
