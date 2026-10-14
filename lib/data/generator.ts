import { PROFILES } from "./profiles";
import type { Profile } from "./profiles/types";
import { FEMALE_NAMES, MALE_NAMES, firstName } from "./names";
import { createRng, fill, type Rng } from "./random";
import { vacancyText } from "./templates";
import type {
  Activity, BizDocument, BusinessData, BusinessType, Call, Candidate, Channel, Client, Conversation,
  Deal, DealStage, Employee, Mention, Message, Notification, Post, Service, Transaction, Vacancy,
} from "./types";
import { formatMoney } from "../utils";

const CHANNELS: Channel[] = ["instagram", "whatsapp", "telegram", "website", "2gis"];
const CHANNEL_WEIGHTS = [0.38, 0.32, 0.14, 0.08, 0.08];
const HISTORY_DAYS = 60;

const SEEDS: Record<BusinessType, number> = { beauty: 1042, cafe: 2077, shop: 3011, auto: 4099 };

/** Коэффициенты выручки по дням недели (0 — воскресенье). Вторник — заметно слабее. */
const WEEKDAY_FACTOR = [0.95, 1.0, 0.62, 1.0, 1.05, 1.15, 1.25];

function at(base: Date, daysBack: number, hour: number, minute: number) {
  const d = new Date(base);
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, minute, rngSecond(hour, minute), 0);
  return d;
}
function rngSecond(h: number, m: number) {
  return (h * 7 + m * 13) % 60;
}

/** Время «сегодня» строго до текущего момента */
function todayBefore(now: Date, rng: Rng, maxMinutesAgo = 600, minMinutesAgo = 3) {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const sinceMidnight = Math.floor((now.getTime() - midnight.getTime()) / 60000);
  const upper = Math.max(minMinutesAgo + 1, Math.min(maxMinutesAgo, sinceMidnight - 1));
  const ago = rng.int(minMinutesAgo, upper);
  return new Date(now.getTime() - ago * 60000);
}

function phone(rng: Rng) {
  const ops = ["701", "702", "705", "707", "747", "771", "775", "777", "778"];
  return `+7 ${rng.pick(ops)} ${rng.int(100, 999)} ${String(rng.int(10, 99))} ${String(rng.int(10, 99))}`;
}

export function generateBusinessData(type: BusinessType, now = new Date()): BusinessData {
  const p = PROFILES[type];
  const rng = createRng(SEEDS[type]);
  let idc = 0;
  const id = (prefix: string) => `${prefix}_${(++idc).toString(36)}`;

  // ---------- Услуги ----------
  const services: Service[] = p.services.map((s, i) => ({ id: `svc_${i + 1}`, ...s }));

  // ---------- Сотрудники ----------
  const employees: Employee[] = p.staff.map((s, i) => {
    const slowEvening = i === 0; // «Айгерим отвечает в 3 раза медленнее вечером»
    const morning = slowEvening ? rng.int(3, 5) : rng.int(3, 9);
    const evening = slowEvening ? morning * 3 + rng.int(0, 2) : morning + rng.int(-1, 3);
    const leads = s.serves ? rng.int(40, 95) : rng.int(110, 160);
    return {
      id: `emp_${i + 1}`,
      name: s.name,
      role: s.role,
      shift: s.shift,
      serves: s.serves,
      leads,
      responseMorning: morning,
      responseEvening: Math.max(2, evening),
      responseMin: Math.round(((morning + Math.max(2, evening)) / 2) * 10) / 10,
      conversion: rng.int(38, 74),
      rating: Math.round((4.3 + rng.next() * 0.65) * 10) / 10,
      activity: Array.from({ length: 7 }, (_, d) => Math.round((d === 1 ? 0.6 : 1) * rng.int(8, 22))),
    };
  });
  const servingEmployees = employees.filter((e) => e.serves);
  const staffNames = new Set(p.staff.map((s) => s.name));

  // ---------- Клиенты ----------
  const female = rng.shuffle(FEMALE_NAMES.filter((n) => !staffNames.has(n)));
  const male = rng.shuffle(MALE_NAMES.filter((n) => !staffNames.has(n)));
  const CLIENT_COUNT = 48;
  const clients: Client[] = [];
  for (let i = 0; i < CLIENT_COUNT; i++) {
    const isFemale = rng.chance(p.femaleRatio);
    const name = (isFemale ? female.pop() : male.pop()) ?? female.pop() ?? male.pop() ?? `Клиент ${i + 1}`;
    const created = at(now, rng.int(1, 240), rng.int(9, 20), rng.int(0, 59));
    clients.push({
      id: `cl_${i + 1}`,
      name,
      phone: phone(rng),
      channel: rng.weighted(CHANNELS, CHANNEL_WEIGHTS),
      tags: rng.shuffle(p.clientTags).slice(0, rng.int(1, 3)),
      temperature: "cold",
      totalSpent: 0,
      visits: 0,
      lastVisit: created.toISOString(),
      createdAt: created.toISOString(),
    });
  }

  // ---------- Транзакции: доходы ----------
  const transactions: Transaction[] = [];
  const medianPrice = [...p.services].map((s) => s.price).sort((a, b) => a - b)[Math.floor(p.services.length / 2)];
  const svcWeights = services.map((s, i) => {
    if (i === p.weakServiceIndex) return 0.18;
    if (s.price > medianPrice * 4) return 0.12;
    return 1;
  });
  const clientWeights = clients.map((_, i) => (i < 20 ? 3 : 1));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(now.getDate() - d);
    const wd = day.getDay();
    if (p.closedSunday && wd === 0) continue;
    // Лёгкий рост бизнеса: последние недели чуть сильнее первых
    const growth = 0.9 + 0.16 * (1 - d / HISTORY_DAYS);
    const count = Math.round(rng.int(p.salesPerDay[0], p.salesPerDay[1]) * WEEKDAY_FACTOR[wd] * growth);
    for (let k = 0; k < count; k++) {
      const hour = rng.int(10, 20);
      const minute = rng.int(0, 59);
      if (d === 0 && hour * 60 + minute >= nowMinutes - 5) continue;
      const svc = rng.weighted(services, svcWeights);
      const qty = p.qty && svc.price < medianPrice * 2 ? rng.int(p.qty[0], p.qty[1]) : 1;
      const client = rng.weighted(clients, clientWeights);
      const emp = rng.pick(servingEmployees);
      transactions.push({
        id: id("tx"),
        type: "income",
        amount: svc.price * qty,
        category: svc.category,
        description: qty > 1 ? `${svc.name} × ${qty}` : svc.name,
        date: at(now, d, hour, minute).toISOString(),
        clientId: client.id,
        employeeId: emp.id,
        serviceId: svc.id,
      });
    }
  }

  // ---------- Транзакции: расходы (две 30-дневные «половины») ----------
  for (const period of [0, 1]) {
    // period 0 — дни 59..30, period 1 — дни 29..0 (последние 30 дней)
    for (const spec of p.expenses) {
      const spike = period === 1 && spec.category === p.spikeCategory ? 1.48 : 1;
      for (let k = 0; k < spec.perMonth; k++) {
        const offset = spec.perMonth === 1 ? 26 : Math.round(28 - (k * 27) / spec.perMonth) - rng.int(0, 2);
        const dBack = period === 0 ? 30 + offset : offset;
        if (dBack < 0 || dBack >= HISTORY_DAYS) continue;
        const date = at(now, dBack, rng.int(9, 18), rng.int(0, 59));
        if (dBack === 0 && date > now) continue;
        const amount = Math.round(((spec.monthly / spec.perMonth) * spike * (0.92 + rng.next() * 0.16)) / 100) * 100;
        transactions.push({
          id: id("tx"),
          type: "expense",
          amount,
          category: spec.category,
          description: spec.descriptions[k % spec.descriptions.length],
          date: date.toISOString(),
        });
      }
    }
  }
  // Разовый незапланированный расход в последние 30 дней — второй «пожиратель» прибыли
  transactions.push({
    id: id("tx"),
    type: "expense",
    amount: 86000,
    category: "Ремонт и обслуживание",
    description: "Срочный ремонт кондиционера",
    date: at(now, 9, 15, 20).toISOString(),
  });
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  // Пересчёт статистики клиентов из транзакций
  for (const tx of transactions) {
    if (tx.type !== "income" || !tx.clientId) continue;
    const c = clients.find((x) => x.id === tx.clientId)!;
    c.totalSpent += tx.amount;
    c.visits += 1;
    if (tx.date > c.lastVisit || c.visits === 1) c.lastVisit = tx.date > c.lastVisit ? tx.date : c.lastVisit;
  }

  // ---------- Диалоги ----------
  const conversations: Conversation[] = [];
  const CONV_COUNT = 27;
  const TODAY_CONVS = 8;
  for (let i = 0; i < CONV_COUNT; i++) {
    const client = clients[i];
    const script = p.dialogs[i % p.dialogs.length];
    const svc = services[(i * 3) % services.length];
    const master = rng.pick(servingEmployees);
    let t: Date = i < TODAY_CONVS ? todayBefore(now, rng, 540, 4 + i * 6) : at(now, rng.int(1, 20), rng.int(9, 20), rng.int(0, 59));
    const vars = {
      name: firstName(client.name),
      service: svc.name,
      price: formatMoney(svc.price),
      master: firstName(master.name),
      address: p.address,
      biz: p.name,
    };
    const manual = i === 5 || i === 13;
    const messages: Message[] = script.turns.map((turn, k) => {
      const isClient = k % 2 === 0;
      t = new Date(t.getTime() + (isClient ? rng.int(40, 240) : rng.int(6, 25)) * 1000);
      if (t > now) t = new Date(now.getTime() - (script.turns.length - k) * 15000);
      return {
        id: id("msg"),
        from: isClient ? "client" : manual && k === script.turns.length - 1 ? "manager" : "agent",
        text: fill(turn, vars),
        at: t.toISOString(),
      };
    });
    client.channel = i < 12 ? CHANNELS[i % CHANNELS.length] : client.channel;
    const created = messages[0].at;
    conversations.push({
      id: `conv_${i + 1}`,
      clientId: client.id,
      channel: client.channel,
      messages,
      mode: manual ? "manual" : "auto",
      unread: i < 3 ? rng.int(1, 2) : 0,
      updatedAt: messages[messages.length - 1].at,
      createdAt: created,
      topic: script.topic,
    });
  }
  conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // ---------- Сделки ----------
  const deals: Deal[] = [];
  const stagesPlan: DealStage[] = [
    ...Array<DealStage>(5).fill("new"),
    ...Array<DealStage>(6).fill("in_progress"),
    ...Array<DealStage>(5).fill("awaiting_payment"),
    ...Array<DealStage>(12).fill("paid"),
    ...Array<DealStage>(4).fill("lost"),
  ];
  stagesPlan.forEach((stage, i) => {
    const client = clients[(i * 7) % CLIENT_COUNT] ?? clients[i];
    const conv = conversations.find((c) => c.clientId === client.id);
    const svc = rng.weighted(services, svcWeights);
    const qty = p.qty && svc.price < medianPrice * 2 ? 3 : 1;
    const created = stage === "new" ? todayBefore(now, rng, 300, 10) : at(now, rng.int(0, 12), rng.int(9, 20), rng.int(0, 59));
    const updated = new Date(Math.min(now.getTime() - 60000, created.getTime() + rng.int(10, 600) * 60000));
    deals.push({
      id: `deal_${i + 1}`,
      clientId: client.id,
      title: qty > 1 ? `${svc.name} × ${qty}` : svc.name,
      serviceId: svc.id,
      amount: svc.price * qty,
      stage,
      createdAt: created.toISOString(),
      updatedAt: updated.toISOString(),
      employeeId: rng.pick(servingEmployees).id,
      conversationId: conv?.id,
      movedByAgent: rng.chance(0.7),
    });
  });

  // Температура лидов
  const daysSince = (iso: string) => (now.getTime() - new Date(iso).getTime()) / 86400000;
  for (const c of clients) {
    const openDeal = deals.find((d) => d.clientId === c.id && ["new", "in_progress", "awaiting_payment"].includes(d.stage));
    if (openDeal) c.temperature = openDeal.stage === "awaiting_payment" ? "hot" : "warm";
    else c.temperature = daysSince(c.lastVisit) < 14 ? "warm" : "cold";
    if (c.visits >= 8 && !c.tags.includes("Постоянная") && !c.tags.includes("Постоянный")) c.tags = [p.clientTags[0], ...c.tags].slice(0, 3);
  }
  clients.slice(0, 3).forEach((c) => (c.temperature = "hot"));

  // ---------- Документы ----------
  const documents: BizDocument[] = [];
  const counters = { invoice: 140, act: 52, waybill: 31 };
  const paidDeals = deals.filter((d) => d.stage === "paid").sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  for (const d of paidDeals) {
    const client = clients.find((c) => c.id === d.clientId)!;
    const svc = services.find((s) => s.id === d.serviceId)!;
    const qty = d.amount / svc.price;
    counters.invoice += 1;
    documents.push({
      id: id("doc"),
      kind: "invoice",
      number: `СЧ-${String(counters.invoice).padStart(4, "0")}`,
      date: d.updatedAt,
      counterparty: client.name,
      items: [{ name: svc.name, qty, price: svc.price }],
      total: d.amount,
      status: "paid",
      dealId: d.id,
      byAgent: true,
    });
    if (rng.chance(0.4)) {
      counters.act += 1;
      documents.push({
        id: id("doc"),
        kind: "act",
        number: `АВР-${String(counters.act).padStart(4, "0")}`,
        date: d.updatedAt,
        counterparty: client.name,
        items: [{ name: svc.name, qty, price: svc.price }],
        total: d.amount,
        status: "sent",
        dealId: d.id,
        byAgent: true,
      });
    }
  }
  // Накладные — от поставщиков по расходам
  const supplierCats = p.expenses.filter((e) => e.perMonth >= 3).slice(0, 2);
  supplierCats.forEach((spec, k) => {
    for (let j = 0; j < 2; j++) {
      counters.waybill += 1;
      const total = Math.round(spec.monthly / spec.perMonth / 100) * 100;
      documents.push({
        id: id("doc"),
        kind: "waybill",
        number: `НК-${String(counters.waybill).padStart(4, "0")}`,
        date: at(now, 3 + j * 9 + k * 4, 11, 20).toISOString(),
        counterparty: `ТОО «${["Оптима Трейд", "Дала Снаб", "Тараз Опт", "Саяхат Логистик"][(k * 2 + j) % 4]}»`,
        items: [
          { name: spec.descriptions[j % spec.descriptions.length], qty: 1, price: Math.round(total * 0.7) },
          { name: spec.descriptions[(j + 1) % spec.descriptions.length], qty: 1, price: total - Math.round(total * 0.7) },
        ],
        total,
        status: "paid",
        byAgent: false,
      });
    }
  });
  documents.sort((a, b) => b.date.localeCompare(a.date));

  // ---------- Кандидаты и вакансии ----------
  const usedNames = new Set([...clients.map((c) => c.name), ...staffNames]);
  const candNames = rng.shuffle([...FEMALE_NAMES, ...MALE_NAMES].filter((n) => !usedNames.has(n)));
  const candidates: Candidate[] = p.candidates.map((c, i) => ({
    id: `cand_${i + 1}`,
    name: candNames[i] ?? `Кандидат ${i + 1}`,
    age: rng.int(20, 41),
    role: c.role,
    experience: c.experience,
    source: rng.pick(["hh.kz", "Instagram", "Enbek.kz", "Telegram", "OLX Работа", "Рекомендация"]),
    score: c.score,
    verdict: c.verdict,
    strengths: c.strengths,
    risks: c.risks,
    status: c.score >= 85 ? (i % 2 === 0 ? "invited" : "interview") : c.score < 50 ? "rejected" : "new",
    appliedAt: at(now, rng.int(0, 12), rng.int(9, 21), rng.int(0, 59)).toISOString(),
  }));
  const vacancies: Vacancy[] = p.vacancies.map((v, i) => ({
    id: `vac_${i + 1}`,
    title: v.title,
    salary: v.salary,
    status: "open",
    candidates: candidates.filter((c) => c.role === v.title).length,
    createdAt: at(now, 10 + i * 4, 10, 0).toISOString(),
    text: vacancyText({ title: v.title, salary: v.salary, biz: p.name, address: p.address, hours: p.hours }),
  }));

  // ---------- Звонки ----------
  const calls: Call[] = [];
  const callNames = rng.shuffle(clients.map((c) => c.name));
  for (let i = 0; i < 16; i++) {
    const tpl = p.calls[i % p.calls.length];
    const missed = i === 6 || i === 12;
    const dt = i < 3 ? todayBefore(now, rng, 400, 15 + i * 30) : at(now, Math.floor(i / 3), rng.int(9, 20), rng.int(0, 59));
    calls.push({
      id: `call_${i + 1}`,
      clientName: callNames[i],
      phone: phone(rng),
      direction: missed ? "in" : tpl.direction,
      durationSec: missed ? 0 : rng.int(45, 230),
      at: dt.toISOString(),
      result: missed ? "Перезвонил ИИ, записан" : tpl.result,
      resultKind: missed ? "booked" : tpl.resultKind,
      summary: missed
        ? "Звонок пришёл в нерабочее время. Агент перезвонил утром и записал клиента."
        : tpl.summary,
      sentiment: tpl.sentiment,
      transcript: tpl.transcript,
    });
  }
  calls.sort((a, b) => b.at.localeCompare(a.at));

  // ---------- Посты ----------
  const posts: Post[] = [];
  const postOffsets = rng.shuffle(Array.from({ length: 34 }, (_, k) => k - 17)).slice(0, 22).sort((a, b) => a - b);
  postOffsets.forEach((off, i) => {
    const tpl = p.posts[i % p.posts.length];
    const date = new Date(now);
    date.setDate(now.getDate() + off);
    date.setHours(rng.pick([10, 12, 13, 18, 19]), 0, 0, 0);
    const published = date < now;
    posts.push({
      id: `post_${i + 1}`,
      date: date.toISOString(),
      type: tpl.type,
      title: tpl.title,
      text: tpl.text,
      hashtags: tpl.hashtags,
      status: published ? "published" : "planned",
      reach: published ? rng.int(600, 4200) : undefined,
      likes: published ? rng.int(25, 320) : undefined,
      byAgent: rng.chance(0.75),
    });
  });

  // ---------- Упоминания ----------
  const mentions: Mention[] = p.reviews.map((r, i) => ({
    id: `men_${i + 1}`,
    ...r,
    at: (i < 2 ? todayBefore(now, rng, 300, 20) : at(now, rng.int(1, 14), rng.int(9, 21), rng.int(0, 59))).toISOString(),
    answered: i >= 4 && r.sentiment === "positive",
  }));
  mentions.sort((a, b) => b.at.localeCompare(a.at));

  // ---------- Кампании ----------
  const campaigns = p.campaigns.map((c, i) => {
    const budget = rng.pick([30000, 50000, 80000, 100000, 150000]);
    const spent = i === 4 ? Math.round(budget * 0.2) : Math.round(budget * (0.45 + rng.next() * 0.5));
    const reach = Math.round(spent * (0.25 + rng.next() * 0.4));
    const clicks = Math.round(reach * (0.02 + rng.next() * 0.04));
    const leads = Math.max(2, Math.round(clicks * (0.08 + rng.next() * 0.14)));
    return {
      id: `camp_${i + 1}`,
      name: c.name,
      channel: c.channel,
      status: (i === 3 ? "finished" : i === 2 ? "paused" : "active") as "active" | "paused" | "finished",
      budget,
      spent,
      reach,
      clicks,
      leads,
      start: at(now, rng.int(5, 40), 10, 0).toISOString(),
    };
  });

  // ---------- Лента действий агента (сегодня) ----------
  const activity: Activity[] = [];
  const todayConvs = conversations.filter((c) => new Date(c.createdAt).toDateString() === now.toDateString());
  todayConvs.forEach((c) => {
    const cl = clients.find((x) => x.id === c.clientId)!;
    activity.push({ id: id("act"), at: c.messages[1]?.at ?? c.createdAt, kind: "reply", text: `Ответил ${cl.name} в ${channelName(c.channel)} — «${c.topic.toLowerCase()}»`, href: `/inbox?c=${c.id}` });
  });
  deals.filter((d) => d.stage === "new").forEach((d) => {
    const cl = clients.find((x) => x.id === d.clientId)!;
    activity.push({ id: id("act"), at: d.createdAt, kind: "deal", text: `Создал сделку «${d.title}» для ${cl.name} — ${formatMoney(d.amount)}`, href: "/inbox?tab=funnel" });
  });
  const extra: [Activity["kind"], string, string][] = [
    ["invoice", `Выставил счёт ${documents.find((d) => d.kind === "invoice")?.number ?? ""} и отправил клиенту в WhatsApp`, "/accounting?tab=documents"],
    ["post", `Опубликовал пост «${p.posts[1].title}» в Instagram`, "/marketing?tab=plan"],
    ["reminder", "Напомнил 6 клиентам о завтрашних записях", "/inbox"],
    ["review", `Подготовил ответ на отзыв в 2ГИС (${p.reviews.find((r) => r.sentiment === "negative")?.author ?? "клиент"})`, "/inbox?tab=mentions"],
    ["call", "Принял 3 звонка и записал 2 клиентов", "/calls"],
    ["hr", `Оценил 2 новых резюме на вакансию «${p.vacancies[0].title}»`, "/hr"],
    ["insight", "Заметил падение выручки по вторникам и подготовил акцию", "/marketing?tab=promos"],
  ];
  extra.forEach(([kind, text, href], k) => activity.push({ id: id("act"), at: todayBefore(now, rng, 480, 8 + k * 9).toISOString(), kind, text, href }));
  activity.sort((a, b) => b.at.localeCompare(a.at));

  const notifications: Notification[] = [
    { id: id("ntf"), at: todayBefore(now, rng, 60, 5).toISOString(), title: "Новая заявка", text: `${clients[0].name} написал(а) в ${channelName(conversations[0].channel)}`, read: false, href: `/inbox?c=${conversations[0].id}` },
    { id: id("ntf"), at: todayBefore(now, rng, 180, 30).toISOString(), title: "Негативный отзыв", text: "В 2ГИС появился отзыв на 2★ — агент подготовил ответ", read: false, href: "/inbox?tab=mentions" },
    { id: id("ntf"), at: todayBefore(now, rng, 300, 90).toISOString(), title: "Налоговое напоминание", text: "До 25 числа — социальные платежи за сотрудников", read: false, href: "/accounting?tab=taxes" },
    { id: id("ntf"), at: at(now, 1, 18, 40).toISOString(), title: "Агент заметил", text: "Выручка по вторникам ниже средней — предлагаю акцию", read: true, href: "/marketing?tab=promos" },
  ];

  return {
    type,
    name: p.name,
    city: "Тараз",
    owner: p.owner,
    generatedAt: now.toISOString(),
    services,
    clients,
    conversations,
    deals,
    transactions,
    documents,
    employees,
    candidates,
    vacancies,
    calls,
    posts,
    mentions,
    campaigns,
    activity,
    notifications,
    knowledge: {
      address: p.address,
      phone: p.phone,
      hours: p.hours,
      instagram: p.instagram,
      faq: p.faq,
      rules: p.rules,
      tone: "friendly",
      greeting: p.greeting,
      voice: "Айгуль (женский, тёплый)",
    },
    channels: { instagram: true, whatsapp: true, telegram: true, website: true, "2gis": true, kaspi: type !== "auto" },
    autonomy: "confirm",
    counters,
  };
}

export function channelName(c: Channel) {
  return { instagram: "Instagram", whatsapp: "WhatsApp", telegram: "Telegram", website: "чате сайта", "2gis": "2ГИС" }[c];
}

export function getProfile(type: BusinessType): Profile {
  return PROFILES[type];
}

/** Неиспользованное имя для симуляции нового клиента */
export function pickNewClientName(data: BusinessData, rng = Math.random) {
  const used = new Set([...data.clients.map((c) => c.name), ...data.employees.map((e) => e.name)]);
  const p = PROFILES[data.type];
  const pool = (rng() < p.femaleRatio ? FEMALE_NAMES : MALE_NAMES).filter((n) => !used.has(n));
  const fallback = [...FEMALE_NAMES, ...MALE_NAMES].filter((n) => !used.has(n));
  const list = pool.length ? pool : fallback;
  if (!list.length) return `Клиент ${data.clients.length + 1}`;
  return list[Math.floor(rng() * list.length)];
}

export function randomPhone() {
  const r = createRng(Date.now() % 100000);
  return phone(r);
}
