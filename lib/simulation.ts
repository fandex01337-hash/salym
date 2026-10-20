"use client";

import { toast } from "sonner";
import { clientChatPrompt } from "@/lib/agent/context";
import { localized } from "@/lib/agent/i18n";
import { genericReply } from "@/lib/agent/replies";
import { streamText, type ChatMessage } from "@/lib/ai";
import { channelName, pickNewClientName, randomPhone } from "@/lib/data/generator";
import { firstName } from "@/lib/data/names";
import { PROFILES } from "@/lib/data/profiles";
import { fill } from "@/lib/data/random";
import type { Channel, Client, Conversation } from "@/lib/data/types";
import { formatMoney, sleep, uid } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useLiveStore } from "@/store/live-store";
import { useVoiceStore } from "@/store/voice-store";

const CHANNELS: Channel[] = ["instagram", "whatsapp", "telegram", "website", "2gis"];
let lastScenario = -1;

function getConv(convId: string) {
  return useAppStore.getState().data?.conversations.find((c) => c.id === convId);
}

/** Агент печатает и отправляет сообщение в диалог (реальный ИИ или демо-текст) */
export async function agentSay(convId: string, fallback: string) {
  const store = useAppStore.getState();
  const data = store.data;
  const conv = getConv(convId);
  if (!data || !conv) return null;
  const client = data.clients.find((c) => c.id === conv.clientId);
  const live = useLiveStore.getState();
  live.setTyping(convId, "");

  const history: ChatMessage[] = conv.messages.map((m) => ({ role: m.from === "client" ? "user" : "assistant", content: m.text }));
  const text = await streamText({
    system: clientChatPrompt(data, client?.name ?? "клиент", channelName(conv.channel), useVoiceStore.getState().lang),
    messages: history,
    fallback,
    maxTokens: 300,
    speed: 0.8,
    onToken: (t) => useLiveStore.getState().setTyping(convId, t),
  });
  useLiveStore.getState().setTyping(convId, null);
  return useAppStore.getState().addMessage(convId, { from: "agent", text });
}

/** Ответ агента на последнее сообщение клиента (когда диалог в режиме «Авто») */
export async function agentReplyToLast(convId: string) {
  const data = useAppStore.getState().data;
  const conv = getConv(convId);
  if (!data || !conv) return;
  const last = conv.messages[conv.messages.length - 1];
  if (!last || last.from !== "client") return;
  const client = data.clients.find((c) => c.id === conv.clientId);
  await sleep(600);
  await agentSay(convId, genericReply(data, last.text, client?.name ?? "клиент", useVoiceStore.getState().lang));
}

/** Главный инструмент демо: входящая заявка от случайного клиента, агент отвечает в реальном времени */
export function simulateIncoming(preferred?: Channel): string | null {
  const store = useAppStore.getState();
  const data = store.data;
  if (!data) return null;
  const p = PROFILES[data.type];

  let idx = Math.floor(Math.random() * p.incoming.length);
  if (idx === lastScenario) idx = (idx + 1) % p.incoming.length;
  lastScenario = idx;
  // Тексты клиента и агента — на выбранном языке общения
  const tr = localized(useVoiceStore.getState().lang, data.type)?.incoming[idx];
  const scenario = tr ? { ...p.incoming[idx], ...tr } : p.incoming[idx];
  const channel = preferred ?? CHANNELS[Math.floor(Math.random() * 3)];
  const name = pickNewClientName(data);
  const now = new Date().toISOString();
  const svc = data.services[scenario.serviceIndex] ?? data.services[0];
  const servers = data.employees.filter((e) => e.serves);
  const master = servers[Math.floor(Math.random() * servers.length)];

  const client: Client = {
    id: uid("cl"),
    name,
    phone: randomPhone(),
    channel,
    tags: [p.clientTags.find((t) => t.startsWith("Нов")) ?? "Новый", svc.category],
    temperature: "warm",
    totalSpent: 0,
    visits: 0,
    lastVisit: now,
    createdAt: now,
    note: `Пришёл(ла) из ${channelName(channel)}`,
  };
  const conv: Conversation = {
    id: uid("conv"),
    clientId: client.id,
    channel,
    messages: [{ id: uid("msg"), from: "client", text: scenario.first, at: now }],
    mode: "auto",
    unread: 1,
    createdAt: now,
    updatedAt: now,
    topic: svc.name,
  };
  store.update((d) => {
    d.clients = [client, ...d.clients];
  });
  store.addConversation(conv);
  store.notify({ title: "Новая заявка", text: `${name} · ${channelName(channel)}`, href: `/inbox?c=${conv.id}` });
  toast(`Новая заявка из ${channelName(channel)}`, { description: `${name}: «${scenario.first.slice(0, 60)}…»` });

  const vars = { name: firstName(name), master: firstName(master.name), address: data.knowledge.address, price: formatMoney(svc.price), service: svc.name };
  void runFlow(conv.id, client, { ...scenario, reply1: fill(scenario.reply1, vars), reply2: fill(scenario.reply2, vars) }, svc.id, master.id);
  return conv.id;
}

async function runFlow(
  convId: string,
  client: Client,
  s: { reply1: string; reply2: string; followUp: string },
  serviceId: string,
  employeeId: string,
) {
  const live = useLiveStore.getState();
  live.setSimulating(true);
  try {
    const isAuto = () => getConv(convId)?.mode === "auto";
    await sleep(900);
    if (!isAuto()) return;
    await agentSay(convId, s.reply1);
    useAppStore.getState().addActivity({ kind: "reply", text: `Ответил ${client.name} в ${channelName(client.channel)} за 9 секунд`, href: `/inbox?c=${convId}` });

    await sleep(1800);
    useAppStore.getState().addMessage(convId, { from: "client", text: s.followUp });
    await sleep(500);
    if (!isAuto()) return;
    await agentSay(convId, s.reply2);

    const data = useAppStore.getState().data!;
    const svc = data.services.find((x) => x.id === serviceId)!;
    const p = PROFILES[data.type];
    const deal = useAppStore.getState().addDeal({
      clientId: client.id,
      title: svc.name,
      serviceId,
      amount: svc.price,
      stage: "new",
      employeeId,
      conversationId: convId,
      movedByAgent: true,
    });
    useAppStore.getState().addActivity({ kind: "deal", text: `${p.bookVerb[0].toUpperCase() + p.bookVerb.slice(1)} ${client.name} — «${svc.name}», создал сделку на ${formatMoney(svc.price)}`, href: "/inbox?tab=funnel" });
    useLiveStore.getState().setHighlight(deal.id);
    toast.success("Агент создал сделку", {
      description: `${client.name} · ${svc.name} · ${formatMoney(svc.price)}`,
      action: { label: "Воронка", onClick: () => window.dispatchEvent(new CustomEvent("salym:navigate", { detail: "/inbox?tab=funnel" })) },
    });

    await sleep(1600);
    useAppStore.getState().moveDeal(deal.id, "in_progress", true);
    useAppStore.getState().update((d) => {
      d.clients = d.clients.map((c) => (c.id === client.id ? { ...c, temperature: "hot" } : c));
    });
    useLiveStore.getState().setHighlight(deal.id);
    setTimeout(() => useLiveStore.getState().setHighlight(null), 4000);
  } finally {
    useLiveStore.getState().setSimulating(false);
  }
}
