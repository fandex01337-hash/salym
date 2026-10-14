import { PROFILES } from "@/lib/data/profiles";
import type { BusinessData, PostType } from "@/lib/data/types";
import { sleepingClients, weakService, weekdayRevenue } from "@/lib/analytics";
import { WEEKDAYS_PLURAL_DAT, formatMoney } from "@/lib/utils";

export type Tone = "friendly" | "premium" | "fun" | "formal";

export const POST_TYPES: { id: PostType; label: string }[] = [
  { id: "instagram", label: "Пост в Instagram" },
  { id: "stories", label: "Сторис" },
  { id: "ad", label: "Объявление (чат / OLX)" },
  { id: "promo", label: "Рекламный текст" },
  { id: "review", label: "Ответ на отзыв" },
];

export const TONES: { id: Tone; label: string }[] = [
  { id: "friendly", label: "Дружелюбный" },
  { id: "premium", label: "Премиальный" },
  { id: "fun", label: "С юмором" },
  { id: "formal", label: "Официальный" },
];

export interface Promo {
  id: string;
  title: string;
  reason: string;
  effect: string;
  topic: string;
  badge: string;
}

/** «Умные акции» на основе данных бухгалтерии и заявок */
export function smartPromos(data: BusinessData): Promo[] {
  const wd = weekdayRevenue(data);
  const ws = weakService(data);
  const sleeping = sleepingClients(data);
  const p = PROFILES[data.type];
  const extraWeekday = Math.round((wd.avg - wd.weakest.value) * 0.5 * 4);
  return [
    {
      id: "weekday",
      title: `−15% по ${wd.weakestDat}`,
      reason: `${wd.weakest.name} — самый слабый день: ${formatMoney(wd.weakest.value)} против ${formatMoney(wd.avg)} в среднем (−${wd.dropPct}%).`,
      effect: `+${formatMoney(extraWeekday)} в месяц`,
      topic: `Скидка 15% по ${wd.weakestDat} на все услуги`,
      badge: "Бухгалтерия",
    },
    {
      id: "service",
      title: `Акция на «${ws.name}»`,
      reason: `Всего ${ws.count} продаж за месяц при среднем ${ws.avgCount} по другим позициям.`,
      effect: `+${Math.max(6, Math.round(ws.avgCount * 0.5))} продаж в месяц`,
      topic: `${ws.name} со скидкой 20% до конца месяца`,
      badge: "Аналитика продаж",
    },
    {
      id: "sleeping",
      title: "Вернуть «спящих» клиентов",
      reason: `${sleeping.length} постоянных клиентов не приходили больше 30 дней. Агент напишет каждому персонально в WhatsApp.`,
      effect: `≈ ${Math.max(3, Math.round(sleeping.length * 0.25))} возвратов`,
      topic: `Скучаем по вам! Персональная скидка 10% для постоянных ${p.clientWord === "гость" ? "гостей" : "клиентов"}`,
      badge: "Заявки и CRM",
    },
  ];
}

export function promoTopic(data: BusinessData, promoId: string | null) {
  if (!promoId) return null;
  return smartPromos(data).find((p) => p.id === promoId)?.topic ?? null;
}

const EMOJI: Record<string, string[]> = {
  beauty: ["💅", "✨", "🌸", "💜"],
  cafe: ["🍲", "🔥", "☕", "🎉"],
  shop: ["🏡", "🎁", "✨", "💛"],
  auto: ["🔧", "🚗", "⚡", "🛞"],
};

const HASHTAGS: Record<string, string[]> = {
  beauty: ["#тараз", "#салонкрасотытараз", "#маникюртараз", "#красотатараз"],
  cafe: ["#тараз", "#кафетараз", "#гдепоестьтараз", "#казахскаякухня"],
  shop: ["#тараз", "#декортараз", "#подаркитараз", "#уютныйдом"],
  auto: ["#тараз", "#автосервистараз", "#сторемонт", "#автотараз"],
};

/** Демо-генерация текста (без ИИ-ключа) */
export function generateContent(data: BusinessData, opts: { type: PostType; topic: string; tone: Tone }) {
  const e = EMOJI[data.type];
  const k = data.knowledge;
  const brand = data.name.replace(/^.*«|»$/g, "");
  const topic = opts.topic.trim() || "Наши услуги";
  const tag = `#${brand.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "")}`;
  const hashtags = [...HASHTAGS[data.type], tag, opts.type === "promo" || /скидк|акци/i.test(topic) ? "#акциятараз" : "#рекомендую"];

  const hooks: Record<Tone, string> = {
    friendly: `${e[0]} ${topic}!`,
    premium: `${topic}. Для тех, кто ценит лучшее ${e[1]}`,
    fun: `Внимание, это не учения! ${topic} ${e[2]}`,
    formal: `Уважаемые клиенты! ${topic}.`,
  };
  const bodies: Record<Tone, string> = {
    friendly: `Мы подготовили для вас приятный повод заглянуть к нам ${e[2]} Ждём в ${brand} — профессионально, уютно и с душой.`,
    premium: `Безупречное качество, внимание к деталям и сервис, который запоминается. ${brand} — место, куда хочется возвращаться.`,
    fun: `Мы проверили: настроение поднимается на 100% уже на пороге ${brand} ${e[3]} Берите подругу, друга, маму — всем хватит!`,
    formal: `${brand} предлагает воспользоваться специальным предложением. Количество мест ограничено.`,
  };
  const cta = `📍 ${k.address.replace("г. Тараз, ", "")}\n⏰ ${k.hours}\n📲 Запись и вопросы — в директ или WhatsApp ${k.phone}`;

  let text: string;
  switch (opts.type) {
    case "stories":
      text = `${hooks[opts.tone]}\n\nУспейте до конца недели ⏳\nЖмите «Написать» 👇`;
      break;
    case "ad":
      text = `${topic} — ${brand}, Тараз\n\n${bodies.formal}\n\n✔ Опытные мастера\n✔ Оплата Kaspi, рассрочка\n✔ Удобная онлайн-запись 24/7\n\n${cta}`;
      break;
    case "review":
      text = `Спасибо, что поделились впечатлениями! ${e[3]} Нам очень важно ваше мнение — передадим команде. Ждём вас снова в ${brand}!`;
      break;
    case "promo":
      text = `${hooks[opts.tone]}\n\n${bodies[opts.tone]}\n\n🎯 Только до конца месяца\n💳 Kaspi QR, Kaspi Red\n\n${cta}`;
      break;
    default:
      text = `${hooks[opts.tone]}\n\n${bodies[opts.tone]}\n\n${cta}`;
  }
  return { text, hashtags: opts.type === "review" ? [] : hashtags };
}

export function contentPrompt(opts: { type: PostType; topic: string; tone: Tone }) {
  const type = POST_TYPES.find((t) => t.id === opts.type)?.label ?? "Пост";
  const tone = TONES.find((t) => t.id === opts.tone)?.label ?? "Дружелюбный";
  return `Напиши: ${type}. Тема: «${opts.topic}». Тон: ${tone}. Используй данные бизнеса (адрес, график, контакты). 3–6 коротких абзацев, эмодзи уместно. В самом конце отдельной строкой дай 5–6 хэштегов на русском, начиная с #тараз. Без markdown.`;
}

export function splitHashtags(raw: string) {
  const tags = raw.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  const lines = raw.split("\n");
  const body = lines.filter((l) => !/^\s*(#[\p{L}\p{N}_]+\s*)+$/u.test(l)).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text: body, hashtags: [...new Set(tags)].slice(0, 8) };
}

export const WEEKDAY_DAT = WEEKDAYS_PLURAL_DAT;
