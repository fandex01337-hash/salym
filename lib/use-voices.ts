"use client";

import { useEffect, useState } from "react";
import { getPreset, guessGender, isNatural, isSpeechSupported, loadVoices, resolveVoice, voicesFor, type ResolvedVoice } from "./voice";
import { useVoiceStore } from "@/store/voice-store";

/** Список голосов устройства (обновляется, когда браузер догружает голоса) */
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const supported = isSpeechSupported();
  useEffect(() => {
    if (!supported) return;
    let alive = true;
    void loadVoices().then((v) => alive && setVoices(v));
    const onChange = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    return () => {
      alive = false;
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
    };
  }, [supported]);
  return { voices, supported };
}

/** Голос агента и «собеседника» по текущим настройкам и языку общения */
export function useAgentVoices() {
  const { voices, supported } = useVoices();
  const { presetId, voiceURI, rate, enabled, voiceOthers, lang } = useVoiceStore();
  const preset = getPreset(presetId);
  const agent: ResolvedVoice = resolveVoice(voices, preset.gender, { pitch: preset.pitch, rate: preset.rate * rate, voiceURI, prefer: preset.prefer, lang });
  const other = (name: string): ResolvedVoice => {
    const gender = guessGender(name);
    return resolveVoice(voices, gender, { pitch: gender === "female" ? 1.1 : 0.95, rate, avoidURI: agent.voice?.voiceURI, lang });
  };
  const hasRussian = voicesFor(voices, "ru").length > 0;
  const hasNatural = voicesFor(voices, "ru").some(isNatural);
  /** Есть ли на устройстве голос для выбранного языка (для казахского часто нет) */
  const hasLangVoice = voicesFor(voices, lang).length > 0;
  return { supported, voices, preset, agent, other, enabled: enabled && supported, voiceOthers, hasRussian, hasNatural, hasLangVoice, lang };
}
