export type BusinessType = "beauty" | "cafe" | "shop" | "auto";
export type Channel = "instagram" | "whatsapp" | "telegram" | "website" | "2gis";
export type ConnectorId = Channel | "kaspi";
export type Temperature = "hot" | "warm" | "cold";
export type DealStage = "new" | "in_progress" | "awaiting_payment" | "paid" | "lost";
export type Autonomy = "suggest" | "confirm" | "auto";
export type Sentiment = "positive" | "neutral" | "negative";

export interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  channel: Channel;
  tags: string[];
  temperature: Temperature;
  totalSpent: number;
  visits: number;
  lastVisit: string;
  createdAt: string;
  note?: string;
}

export interface Message {
  id: string;
  from: "client" | "agent" | "manager";
  text: string;
  at: string;
}

export interface Conversation {
  id: string;
  clientId: string;
  channel: Channel;
  messages: Message[];
  mode: "auto" | "manual";
  unread: number;
  updatedAt: string;
  createdAt: string;
  topic: string;
}

export interface Deal {
  id: string;
  clientId: string;
  title: string;
  serviceId: string;
  amount: number;
  stage: DealStage;
  createdAt: string;
  updatedAt: string;
  employeeId?: string;
  conversationId?: string;
  movedByAgent?: boolean;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
  clientId?: string;
  employeeId?: string;
  dealId?: string;
  serviceId?: string;
}

export interface DocItem {
  name: string;
  qty: number;
  price: number;
}

export interface BizDocument {
  id: string;
  kind: "invoice" | "act" | "waybill";
  number: string;
  date: string;
  counterparty: string;
  items: DocItem[];
  total: number;
  status: "paid" | "sent" | "draft";
  dealId?: string;
  byAgent: boolean;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  shift: "Утро" | "Вечер" | "Полный день";
  leads: number;
  responseMin: number;
  responseMorning: number;
  responseEvening: number;
  conversion: number;
  rating: number;
  activity: number[]; // 7 дней (Пн..Вс)
  serves: boolean; // выполняет услуги (получает выручку)
}

export interface Candidate {
  id: string;
  name: string;
  age: number;
  role: string;
  experience: string;
  source: string;
  score: number;
  verdict: string;
  strengths: string[];
  risks: string[];
  status: "new" | "interview" | "invited" | "rejected";
  appliedAt: string;
}

export interface Vacancy {
  id: string;
  title: string;
  salary: string;
  status: "open" | "draft";
  candidates: number;
  createdAt: string;
  text: string;
}

export interface TranscriptLine {
  who: "client" | "ai";
  text: string;
}

export interface Call {
  id: string;
  clientName: string;
  phone: string;
  direction: "in" | "out";
  durationSec: number;
  at: string;
  result: string;
  resultKind: "booked" | "info" | "missed" | "complaint";
  summary: string;
  sentiment: Sentiment;
  transcript: TranscriptLine[];
}

export type PostType = "instagram" | "stories" | "ad" | "promo" | "review";

export interface Post {
  id: string;
  date: string;
  type: PostType;
  title: string;
  text: string;
  hashtags: string[];
  status: "planned" | "published" | "draft";
  reach?: number;
  likes?: number;
  byAgent: boolean;
}

export interface Mention {
  id: string;
  source: "instagram" | "2gis" | "google" | "telegram";
  author: string;
  text: string;
  rating?: number;
  sentiment: Sentiment;
  at: string;
  suggestedReply: string;
  answered: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: "active" | "paused" | "finished";
  budget: number;
  spent: number;
  reach: number;
  clicks: number;
  leads: number;
  start: string;
}

export type ActivityKind = "reply" | "deal" | "invoice" | "post" | "reminder" | "insight" | "call" | "hr" | "review";

export interface Activity {
  id: string;
  at: string;
  kind: ActivityKind;
  text: string;
  href?: string;
}

export interface Notification {
  id: string;
  at: string;
  title: string;
  text: string;
  read: boolean;
  href?: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Knowledge {
  address: string;
  phone: string;
  hours: string;
  instagram: string;
  faq: FaqItem[];
  rules: string[];
  tone: "friendly" | "formal" | "casual";
  greeting: string;
  voice: string;
}

export interface BusinessData {
  type: BusinessType;
  name: string;
  city: string;
  owner: string;
  generatedAt: string;
  services: Service[];
  clients: Client[];
  conversations: Conversation[];
  deals: Deal[];
  transactions: Transaction[];
  documents: BizDocument[];
  employees: Employee[];
  candidates: Candidate[];
  vacancies: Vacancy[];
  calls: Call[];
  posts: Post[];
  mentions: Mention[];
  campaigns: Campaign[];
  activity: Activity[];
  notifications: Notification[];
  knowledge: Knowledge;
  channels: Record<ConnectorId, boolean>;
  autonomy: Autonomy;
  counters: { invoice: number; act: number; waybill: number };
}
