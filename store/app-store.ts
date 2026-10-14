"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { generateBusinessData } from "@/lib/data/generator";
import type {
  Activity, Autonomy, BizDocument, BusinessData, BusinessType, Call, Campaign, Candidate, ConnectorId,
  Conversation, Deal, DealStage, Knowledge, Message, Notification, Post, Transaction, Vacancy,
} from "@/lib/data/types";
import { uid } from "@/lib/utils";

export const STAGE_LABELS: Record<DealStage, string> = {
  new: "Новая",
  in_progress: "В работе",
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачено",
  lost: "Отказ",
};

interface AppState {
  businessType: BusinessType;
  data: BusinessData | null;

  ensureData: () => void;
  setBusiness: (type: BusinessType) => void;
  resetDemo: () => void;
  update: (fn: (d: BusinessData) => void) => void;

  // Активность и уведомления
  addActivity: (a: Omit<Activity, "id" | "at"> & { at?: string }) => void;
  notify: (n: Omit<Notification, "id" | "at" | "read">) => void;
  markNotificationsRead: () => void;

  // Диалоги
  addConversation: (c: Conversation) => void;
  addMessage: (convId: string, m: Omit<Message, "id" | "at"> & { at?: string }) => Message;
  setConversationMode: (convId: string, mode: Conversation["mode"]) => void;
  markConversationRead: (convId: string) => void;

  // Сделки и бухгалтерия
  addDeal: (d: Omit<Deal, "id" | "createdAt" | "updatedAt">) => Deal;
  moveDeal: (dealId: string, stage: DealStage, byAgent?: boolean) => { invoice?: BizDocument } | void;
  addTransaction: (t: Omit<Transaction, "id">) => void;

  // Маркетинг
  addPost: (p: Omit<Post, "id">) => Post;
  updatePost: (id: string, patch: Partial<Post>) => void;
  addCampaign: (c: Omit<Campaign, "id">) => void;
  answerMention: (id: string) => void;

  // HR и звонки
  setCandidateStatus: (id: string, status: Candidate["status"]) => void;
  addVacancy: (v: Omit<Vacancy, "id">) => void;
  addCall: (c: Omit<Call, "id">) => void;

  // Мозг агента
  setKnowledge: (patch: Partial<Knowledge>) => void;
  setServices: (services: BusinessData["services"]) => void;
  toggleChannel: (id: ConnectorId) => void;
  setAutonomy: (a: Autonomy) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const update = (fn: (d: BusinessData) => void) =>
        set((s) => {
          if (!s.data) return s;
          const copy: BusinessData = { ...s.data };
          fn(copy);
          return { data: copy };
        });

      const addActivityRaw = (d: BusinessData, a: Omit<Activity, "id" | "at"> & { at?: string }) => {
        d.activity = [{ id: uid("act"), at: a.at ?? new Date().toISOString(), kind: a.kind, text: a.text, href: a.href }, ...d.activity].slice(0, 80);
      };

      return {
        businessType: "beauty",
        data: null,

        ensureData: () => {
          const s = get();
          if (!s.data || s.data.type !== s.businessType) set({ data: generateBusinessData(s.businessType) });
        },
        setBusiness: (type) => set({ businessType: type, data: generateBusinessData(type) }),
        resetDemo: () => set((s) => ({ data: generateBusinessData(s.businessType) })),
        update,

        addActivity: (a) => update((d) => addActivityRaw(d, a)),
        notify: (n) =>
          update((d) => {
            d.notifications = [{ ...n, id: uid("ntf"), at: new Date().toISOString(), read: false }, ...d.notifications].slice(0, 30);
          }),
        markNotificationsRead: () =>
          update((d) => {
            d.notifications = d.notifications.map((n) => ({ ...n, read: true }));
          }),

        addConversation: (c) =>
          update((d) => {
            d.conversations = [c, ...d.conversations];
          }),
        addMessage: (convId, m) => {
          const msg: Message = { id: uid("msg"), at: m.at ?? new Date().toISOString(), from: m.from, text: m.text };
          update((d) => {
            d.conversations = d.conversations
              .map((c) => (c.id === convId ? { ...c, messages: [...c.messages, msg], updatedAt: msg.at } : c))
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          });
          return msg;
        },
        setConversationMode: (convId, mode) =>
          update((d) => {
            d.conversations = d.conversations.map((c) => (c.id === convId ? { ...c, mode } : c));
          }),
        markConversationRead: (convId) =>
          update((d) => {
            if (!d.conversations.some((c) => c.id === convId && c.unread > 0)) return;
            d.conversations = d.conversations.map((c) => (c.id === convId ? { ...c, unread: 0 } : c));
          }),

        addDeal: (deal) => {
          const now = new Date().toISOString();
          const full: Deal = { ...deal, id: uid("deal"), createdAt: now, updatedAt: now };
          update((d) => {
            d.deals = [full, ...d.deals];
          });
          return full;
        },
        moveDeal: (dealId, stage, byAgent = false) => {
          let invoice: BizDocument | undefined;
          update((d) => {
            const deal = d.deals.find((x) => x.id === dealId);
            if (!deal || deal.stage === stage) return;
            const now = new Date().toISOString();
            d.deals = d.deals.map((x) => (x.id === dealId ? { ...x, stage, updatedAt: now, movedByAgent: byAgent } : x));
            const client = d.clients.find((c) => c.id === deal.clientId);
            const svc = d.services.find((s) => s.id === deal.serviceId);

            if (stage === "paid" && !d.documents.some((doc) => doc.dealId === dealId && doc.kind === "invoice")) {
              const counters = { ...d.counters, invoice: d.counters.invoice + 1 };
              d.counters = counters;
              const qty = svc ? Math.max(1, Math.round(deal.amount / svc.price)) : 1;
              invoice = {
                id: uid("doc"),
                kind: "invoice",
                number: `СЧ-${String(counters.invoice).padStart(4, "0")}`,
                date: now,
                counterparty: client?.name ?? "Клиент",
                items: [{ name: svc?.name ?? deal.title, qty, price: svc ? svc.price : deal.amount }],
                total: deal.amount,
                status: "paid",
                dealId,
                byAgent: true,
              };
              d.documents = [invoice, ...d.documents];
              d.transactions = [
                {
                  id: uid("tx"),
                  type: "income",
                  amount: deal.amount,
                  category: svc?.category ?? "Продажи",
                  description: `${deal.title} — ${client?.name ?? ""}`.trim(),
                  date: now,
                  clientId: deal.clientId,
                  employeeId: deal.employeeId,
                  dealId,
                  serviceId: deal.serviceId,
                },
                ...d.transactions,
              ];
              d.clients = d.clients.map((c) =>
                c.id === deal.clientId ? { ...c, totalSpent: c.totalSpent + deal.amount, visits: c.visits + 1, lastVisit: now, temperature: "warm" } : c,
              );
              addActivityRaw(d, { kind: "invoice", text: `Выставил счёт ${invoice.number} на ${deal.amount.toLocaleString("ru-RU")} ₸ — ${client?.name ?? ""}, доход учтён в бухгалтерии`, href: `/accounting?tab=documents&doc=${invoice.id}` });
              d.notifications = [
                { id: uid("ntf"), at: now, read: false, title: "Счёт выставлен", text: `${invoice.number} · ${client?.name ?? ""} · ${deal.amount.toLocaleString("ru-RU")} ₸`, href: `/accounting?tab=documents&doc=${invoice.id}` },
                ...d.notifications,
              ];
            } else if (stage === "awaiting_payment") {
              d.clients = d.clients.map((c) => (c.id === deal.clientId ? { ...c, temperature: "hot" } : c));
            } else if (stage === "lost") {
              d.clients = d.clients.map((c) => (c.id === deal.clientId ? { ...c, temperature: "cold" } : c));
            }
          });
          return { invoice };
        },
        addTransaction: (t) =>
          update((d) => {
            d.transactions = [{ ...t, id: uid("tx") }, ...d.transactions];
          }),

        addPost: (p) => {
          const post: Post = { ...p, id: uid("post") };
          update((d) => {
            d.posts = [...d.posts, post].sort((a, b) => a.date.localeCompare(b.date));
          });
          return post;
        },
        updatePost: (id, patch) =>
          update((d) => {
            d.posts = d.posts.map((p) => (p.id === id ? { ...p, ...patch } : p));
          }),
        addCampaign: (c) =>
          update((d) => {
            d.campaigns = [{ ...c, id: uid("camp") }, ...d.campaigns];
          }),
        answerMention: (id) =>
          update((d) => {
            d.mentions = d.mentions.map((m) => (m.id === id ? { ...m, answered: true } : m));
            const m = d.mentions.find((x) => x.id === id);
            addActivityRaw(d, { kind: "review", text: `Ответил на отзыв ${m?.author ?? ""}`, href: "/inbox?tab=mentions" });
          }),

        setCandidateStatus: (id, status) =>
          update((d) => {
            d.candidates = d.candidates.map((c) => (c.id === id ? { ...c, status } : c));
          }),
        addVacancy: (v) =>
          update((d) => {
            d.vacancies = [{ ...v, id: uid("vac") }, ...d.vacancies];
          }),
        addCall: (c) =>
          update((d) => {
            d.calls = [{ ...c, id: uid("call") }, ...d.calls];
          }),

        setKnowledge: (patch) =>
          update((d) => {
            d.knowledge = { ...d.knowledge, ...patch };
          }),
        setServices: (services) =>
          update((d) => {
            d.services = services;
          }),
        toggleChannel: (id) =>
          update((d) => {
            d.channels = { ...d.channels, [id]: !d.channels[id] };
          }),
        setAutonomy: (a) =>
          update((d) => {
            d.autonomy = a;
          }),
      };
    },
    {
      name: "salym-demo-v1",
      // При изменении генератора данных увеличьте версию — данные пересоздадутся
      version: 5,
      migrate: (persisted) => ({ ...(persisted as object), data: null }) as unknown as AppState,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ businessType: s.businessType, data: s.data }),
    },
  ),
);

/** Хук для данных бизнеса — в компонентах внутри AppShell data всегда есть */
export function useData() {
  return useAppStore((s) => s.data) as BusinessData;
}
