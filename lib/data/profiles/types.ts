import type { BusinessType, Call, FaqItem, Mention, PostType, TranscriptLine } from "../types";

/**
 * Профиль типа бизнеса — «сырьё» для генератора демо-данных.
 * Плейсхолдеры в текстах: {name} {service} {price} {time} {day} {biz} {address} {master}
 */
export interface DialogScript {
  /** Чередование: клиент, агент, клиент, агент… */
  turns: string[];
  topic: string;
}

export interface IncomingScenario {
  first: string;
  followUp: string;
  serviceIndex: number;
  /** Демо-ответы агента (если нет реального ИИ) */
  reply1: string;
  reply2: string;
}

export interface ExpenseSpec {
  category: string;
  /** Сумма в месяц, ₸ */
  monthly: number;
  /** Сколько платежей в месяц */
  perMonth: number;
  descriptions: string[];
}

export interface PostTemplate {
  type: PostType;
  title: string;
  text: string;
  hashtags: string[];
}

export interface CallTemplate {
  direction: Call["direction"];
  result: string;
  resultKind: Call["resultKind"];
  sentiment: Call["sentiment"];
  summary: string;
  transcript: TranscriptLine[];
}

export interface StaffSpec {
  name: string;
  role: string;
  serves: boolean;
  shift: "Утро" | "Вечер" | "Полный день";
}

export interface CandidateSpec {
  role: string;
  experience: string;
  score: number;
  verdict: string;
  strengths: string[];
  risks: string[];
}

export interface Profile {
  type: BusinessType;
  label: string;
  name: string;
  owner: string;
  address: string;
  phone: string;
  hours: string;
  instagram: string;
  femaleRatio: number;
  services: { name: string; price: number; category: string }[];
  /** Индекс услуги/товара, которая продаётся плохо */
  weakServiceIndex: number;
  /** Сколько продаж в день (мин, макс) */
  salesPerDay: [number, number];
  /** Количество позиций в чеке (для кафе) */
  qty?: [number, number];
  /** Выходной в воскресенье */
  closedSunday?: boolean;
  expenses: ExpenseSpec[];
  /** Категория, которая резко выросла в последние 30 дней */
  spikeCategory: string;
  spikeReason: string;
  staff: StaffSpec[];
  clientTags: string[];
  dialogs: DialogScript[];
  incoming: IncomingScenario[];
  reviews: Omit<Mention, "id" | "at" | "answered">[];
  posts: PostTemplate[];
  vacancies: { title: string; salary: string }[];
  candidates: CandidateSpec[];
  calls: CallTemplate[];
  liveCall: TranscriptLine[];
  faq: FaqItem[];
  rules: string[];
  greeting: string;
  campaigns: { name: string; channel: string }[];
  /** Подсказки для генератора контента */
  promoIdea: string;
  /** Как называть клиента: клиент/гость/покупатель */
  clientWord: string;
  /** Единица работы: «записал», «забронировал», «оформил заказ» */
  bookVerb: string;
  docKindForSupplier: "waybill" | "act";
}
