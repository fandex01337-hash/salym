"use client";

/**
 * Голос агента на базе Web Speech API (синтезатор речи браузера/ОС).
 *
 * Качество зависит от голосов устройства, поэтому выбираем лучший доступный:
 *   1) нейроголоса Microsoft Edge (Светлана, Дария, Дмитрий — «Natural», нужен интернет);
 *   2) сетевые голоса Google в Chrome;
 *   3) системные голоса (Windows: Ирина, Павел; iOS/macOS: Милена, Юрий).
 * Перед озвучкой текст проходит через словарь произношения (бренды, тенге, время, казахские буквы).
 */

export type Gender = "female" | "male";

export interface VoicePreset {
  id: string;
  name: string;
  desc: string;
  gender: Gender;
  pitch: number;
  rate: number;
  /** Предпочтительные нейроголоса (по порядку) */
  prefer: string[];
}

export const VOICE_PRESETS: VoicePreset[] = [
  { id: "aigul", name: "Айгуль", desc: "женский, тёплый", gender: "female", pitch: 1.05, rate: 1, prefer: ["svetlana", "dariya", "milena"] },
  { id: "madina", name: "Мадина", desc: "женский, энергичный", gender: "female", pitch: 1.15, rate: 1.08, prefer: ["dariya", "svetlana", "milena"] },
  { id: "daniyar", name: "Данияр", desc: "мужской, спокойный", gender: "male", pitch: 0.92, rate: 0.95, prefer: ["dmitry", "yuri", "pavel"] },
  { id: "arman", name: "Арман", desc: "мужской, деловой", gender: "male", pitch: 1, rate: 1.05, prefer: ["dmitry", "yuri", "pavel"] },
];

export function getPreset(id: string | null | undefined) {
  return VOICE_PRESETS.find((p) => p.id === id) ?? VOICE_PRESETS[0];
}

import type { AgentLang } from "./agent/i18n";
import { kkForRussianVoice, kkSpeech } from "./kk-speech";

const FEMALE_RE = /(irina|svetlana|ekaterina|elena|milena|katya|dariya|daria|alena|alyona|anna|tatyana|olga|natalia|aigul|zira|jenny|aria|susan|hazel|samantha|libby|sonia|emma|michelle|ava|female|жен|google русский|google us english)/i;
const MALE_RE = /(pavel|dmitry|dmitri|yuri|maxim|ivan|nikolai|sergey|daulet|david|mark|guy|george|ryan|daniel|christopher|eric|andrew|brian|male|муж)/i;

/** Лучшие голоса для каждого языка (нейроголоса Edge, затем системные) */
const PREFER: Record<AgentLang, Record<Gender, string[]>> = {
  ru: { female: ["svetlana", "dariya", "milena"], male: ["dmitry", "yuri", "pavel"] },
  kk: { female: ["aigul"], male: ["daulet"] },
  en: { female: ["jenny", "aria", "ava", "emma", "samantha", "zira", "google us english"], male: ["guy", "andrew", "brian", "davis", "daniel", "david", "google uk english male"] },
};

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/** Нейросетевой (максимально «живой») голос */
export function isNatural(v: SpeechSynthesisVoice) {
  return /natural|neural/i.test(v.name);
}

/** Оценка качества голоса: чем выше, тем человечнее звучит */
export function voiceQuality(v: SpeechSynthesisVoice) {
  if (isNatural(v)) return 100;
  if (/online/i.test(v.name)) return 80;
  if (/google/i.test(v.name)) return 60;
  if (/(enhanced|premium|siri|milena|yuri)/i.test(v.name)) return 50;
  return v.localService ? 20 : 10;
}

/** Голоса загружаются асинхронно — ждём событие voiceschanged (не дольше 1,5 с) */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

/** Голоса языка, лучшие — первыми */
export function voicesFor(all: SpeechSynthesisVoice[], lang: AgentLang) {
  return all.filter((v) => v.lang.toLowerCase().startsWith(lang)).sort((a, b) => voiceQuality(b) - voiceQuality(a));
}

/** Русские голоса, лучшие — первыми */
export function russianVoices(all: SpeechSynthesisVoice[]) {
  return voicesFor(all, "ru");
}

export function voiceGender(v: SpeechSynthesisVoice): Gender | null {
  if (FEMALE_RE.test(v.name)) return "female";
  if (MALE_RE.test(v.name)) return "male";
  return null;
}

export function shortVoiceName(v: SpeechSynthesisVoice) {
  return v.name.replace(/^Microsoft /, "").replace(/ - .*$/, "").replace(/ Online \(Natural\)/, "");
}

export interface ResolvedVoice {
  voice: SpeechSynthesisVoice | null;
  /** Язык текста, который будет произноситься (может не совпадать с языком голоса) */
  textLang: AgentLang;
  pitch: number;
  rate: number;
  natural: boolean;
  /** Подходящего по полу голоса нет — пол имитируется высотой тона */
  emulated: boolean;
}

/** Подбор голоса: предпочтительный нейроголос → лучший голос нужного пола → любой русский */
export function resolveVoice(
  all: SpeechSynthesisVoice[],
  gender: Gender,
  opts: { pitch?: number; rate?: number; voiceURI?: string | null; avoidURI?: string; prefer?: string[]; lang?: AgentLang } = {},
): ResolvedVoice {
  const lang = opts.lang ?? "ru";
  const pitch = opts.pitch ?? 1;
  const rate = opts.rate ?? 1;
  // Нейроголоса уже звучат естественно — их тон не трогаем, чтобы не испортить
  const make = (voice: SpeechSynthesisVoice, emulatedShift = 1): ResolvedVoice => {
    const natural = isNatural(voice);
    const p = natural ? 1 : Math.min(2, Math.max(0.1, pitch * emulatedShift));
    return { voice, textLang: lang, pitch: p, rate, natural, emulated: emulatedShift !== 1 };
  };
  if (opts.voiceURI) {
    const exact = all.find((v) => v.voiceURI === opts.voiceURI && v.lang.toLowerCase().startsWith(lang));
    if (exact) return make(exact);
  }
  // Голоса нужного языка может не быть: для казахского берём русский (с транслитерацией),
  // для английского — любой доступный, чтобы агент и клиент всё равно звучали разными голосами
  let langPool = voicesFor(all, lang);
  if (!langPool.length && lang === "kk") langPool = voicesFor(all, "ru");
  if (!langPool.length) langPool = [...all].sort((a, b) => voiceQuality(b) - voiceQuality(a));
  const filtered = langPool.filter((v) => v.voiceURI !== opts.avoidURI);
  const pool = filtered.length ? filtered : langPool;
  const prefer = lang === "ru" ? opts.prefer ?? PREFER.ru[gender] : PREFER[lang][gender];
  for (const name of prefer) {
    const hit = pool.find((v) => v.name.toLowerCase().includes(name) && voiceQuality(v) >= 50);
    if (hit) return make(hit);
  }
  const sameGender = pool.find((v) => voiceGender(v) === gender);
  // Нейроголос другого пола лучше старого голоса нужного пола? Нет — пол важнее для «персонажа»
  if (sameGender) return make(sameGender);
  const best = pool[0];
  if (best) {
    const g = voiceGender(best);
    return make(best, g && g !== gender ? (gender === "male" ? 0.72 : 1.3) : 1);
  }
  return { voice: all[0] ?? null, textLang: lang, pitch, rate, natural: false, emulated: true };
}

// ---------------------------------------------------------------- произношение

/** Бренды и сокращения, которые синтезатор читает неправильно */
const PRONUNCIATION: [RegExp, string][] = [
  [/Aru Beauty/gi, "Ару Бьюти"],
  [/Ayana Home/gi, "Аяна Хоум"],
  [/WhatsApp Business/gi, "Ватсап Бизнес"],
  [/WhatsApp/gi, "Ватсап"],
  [/Instagram/gi, "Инстаграм"],
  [/Telegram/gi, "Телеграм"],
  [/Kaspi Red/gi, "Каспи Ред"],
  [/Kaspi QR/gi, "Каспи кью ар"],
  [/Kaspi/gi, "Каспи"],
  [/2ГИС/g, "два гис"],
  [/OLX/g, "о эл икс"],
  [/\bSMS\b/g, "эсэмэс"],
  [/\bCRM\b/g, "си ар эм"],
  // \b в JS не работает с кириллицей — границы слова задаём явно
  [/(?<![А-Яа-яЁё])ИИ(?![А-Яа-яЁё])/g, "и-и"],
  [/₸/g, " тенге"],
  [/№\s?/g, "номер "],
];


export function toSpeech(text: string, voiceLang = "ru-RU", textLang: AgentLang = "ru") {
  const vl = textLang === "en" ? "en" : voiceLang.toLowerCase();
  const base = text
    // эмодзи не произносим
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    // «12 000» → «12000», чтобы число читалось целиком
    .replace(/(\d)[\s  ](?=\d{3}\b)/g, "$1");
  // Английский и казахский голоса сами читают бренды и время — меняем только знак валюты
  if (vl.startsWith("en")) return base.replace(/₸/g, " tenge").replace(/\s{2,}/g, " ").trim();
  // Казахский текст: числа, суммы и время — казахскими словами с правильными окончаниями.
  // Если казахского голоса нет, буквы ә/ө/ү/қ… заменяются на близкие по звучанию русские.
  if (textLang === "kk" || vl.startsWith("kk")) {
    const kk = kkSpeech(base).replace(/№\s?/g, "нөмір ").replace(/\s{2,}/g, " ").trim();
    return vl.startsWith("kk") ? kk : kkForRussianVoice(kk);
  }
  let s = base
    // «12 000» → «12000», чтобы число читалось целиком
    .replace(/(\d)[\s  ](?=\d{3}\b)/g, "$1")
    // время: «10:00» → «10 ноль-ноль», «15:30» → «15 30»
    .replace(/\b(\d{1,2}):00\b/g, "$1 ноль-ноль")
    .replace(/\b(\d{1,2}):(\d{2})\b/g, "$1 $2");
  for (const [re, to] of PRONUNCIATION) s = s.replace(re, to);
  s = kkForRussianVoice(s);
  return s.replace(/\s{2,}/g, " ").trim();
}

// ---------------------------------------------------------------- речь

export interface SpeakHandle {
  done: Promise<void>;
  cancel: () => void;
}

/**
 * Произносит текст. onWord(n) сообщает, сколько слов исходного текста уже прозвучало:
 * по событиям границ слов, а если голос их не присылает — по оценке темпа речи.
 */
export function speak(text: string, v: ResolvedVoice, onWord?: (wordsSpoken: number) => void): SpeakHandle {
  const displayTotal = text.split(/\s+/).filter(Boolean).length;
  if (!isSpeechSupported()) return { done: Promise.resolve(), cancel: () => undefined };

  const spoken = toSpeech(text, v.voice?.lang ?? "ru-RU", v.textLang);
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(spoken);
  if (v.voice) {
    u.voice = v.voice;
    u.lang = v.voice.lang;
  } else u.lang = "ru-RU";
  u.pitch = v.pitch;
  u.rate = v.rate;

  // Начала слов произносимого текста — чтобы перевести charIndex в номер слова
  const starts: number[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(spoken))) starts.push(m.index);
  const spokenTotal = Math.max(1, starts.length);

  let said = 0;
  let boundarySeen = false;
  let finished = false;
  let fallback: ReturnType<typeof setInterval> | undefined;
  let safety: ReturnType<typeof setTimeout> | undefined;

  // Слова произносимого текста пересчитываем в слова показываемого (словарь меняет их число)
  const report = (spokenWords: number) => {
    const n = Math.min(displayTotal, Math.round((spokenWords / spokenTotal) * displayTotal));
    if (n > said) {
      said = n;
      onWord?.(said);
    }
  };

  const done = new Promise<void>((resolve) => {
    let spokenCount = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (fallback) clearInterval(fallback);
      if (safety) clearTimeout(safety);
      report(spokenTotal);
      resolve();
    };
    u.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      boundarySeen = true;
      let idx = 0;
      while (idx < starts.length && starts[idx] <= e.charIndex) idx++;
      spokenCount = Math.max(spokenCount, idx);
      report(spokenCount);
    };
    u.onstart = () => {
      // Темп ≈ 2,6 слова в секунду × скорость; события границ слов имеют приоритет
      const perWord = 1000 / (2.6 * v.rate);
      fallback = setInterval(() => {
        if (!boundarySeen && spokenCount < spokenTotal - 1) {
          spokenCount += 1;
          report(spokenCount);
        }
      }, perWord);
    };
    u.onend = finish;
    u.onerror = finish;
    // Страховка: некоторые голоса не присылают onend (а сетевым нужно время на загрузку)
    safety = setTimeout(finish, (spoken.length * 110) / v.rate + 6000);
  });

  synth.speak(u);
  return { done, cancel: () => synth.cancel() };
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

/** Грубая оценка пола по имени — только чтобы озвучить вымышленных клиентов демо разными голосами */
export function guessGender(fullName: string): Gender {
  const [first = "", last = ""] = fullName.toLowerCase().split(/\s+/);
  if (/(ова|ева|ина|ая|кызы|қызы)$/.test(last)) return "female";
  if (/(ов|ев|ин|ий|ұлы|улы)$/.test(last)) return "male";
  return /[ая]$/.test(first) && !/(илья|никита|кузьма)$/.test(first) ? "female" : "male";
}
