import type { BusinessData, Transaction } from "./data/types";
import { PROFILES } from "./data/profiles";
import { MONTHS_NOM, WEEKDAYS_PLURAL_DAT, WEEKDAYS_SHORT, formatMoney, isSameDay, startOfDay } from "./utils";

const DAY = 86400000;

export function inRange(tx: Transaction, fromDaysAgo: number, toDaysAgo: number, now = new Date()) {
  const t = new Date(tx.date).getTime();
  const end = now.getTime() - toDaysAgo * DAY;
  const start = now.getTime() - fromDaysAgo * DAY;
  return t > start && t <= end;
}

export function sum(list: Transaction[]) {
  return list.reduce((s, t) => s + t.amount, 0);
}

export function periodTotals(data: BusinessData, fromDaysAgo: number, toDaysAgo = 0, now = new Date()) {
  const txs = data.transactions.filter((t) => inRange(t, fromDaysAgo, toDaysAgo, now));
  const income = sum(txs.filter((t) => t.type === "income"));
  const expense = sum(txs.filter((t) => t.type === "expense"));
  return { income, expense, profit: income - expense, txs };
}

/** Доход/расход по дням за N дней */
export function dailySeries(data: BusinessData, days = 30, now = new Date()) {
  const today = startOfDay(now);
  const rows = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return { key: d.toDateString(), label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`, date: d, income: 0, expense: 0 };
  });
  const map = new Map(rows.map((r) => [r.key, r]));
  for (const t of data.transactions) {
    const row = map.get(new Date(t.date).toDateString());
    if (!row) continue;
    if (t.type === "income") row.income += t.amount;
    else row.expense += t.amount;
  }
  return rows.map(({ label, income, expense, date }) => ({ label, income, expense, date: date.toISOString() }));
}

export function expensesByCategory(data: BusinessData, fromDaysAgo = 30, toDaysAgo = 0) {
  const map = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.type !== "expense" || !inRange(t, fromDaysAgo, toDaysAgo)) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function incomeByCategory(data: BusinessData, fromDaysAgo = 30) {
  const map = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.type !== "income" || !inRange(t, fromDaysAgo, 0)) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Анализ «что съело прибыль»: сравнение категорий расходов последние 30 дней vs предыдущие 30 */
export function profitDrivers(data: BusinessData) {
  const cur = expensesByCategory(data, 30, 0);
  const prev = expensesByCategory(data, 60, 30);
  const prevMap = new Map(prev.map((x) => [x.name, x.value]));
  const rows = cur
    .map((c) => {
      const before = prevMap.get(c.name) ?? 0;
      return { name: c.name, current: c.value, previous: before, delta: c.value - before, pct: before ? ((c.value - before) / before) * 100 : 100 };
    })
    .sort((a, b) => b.delta - a.delta);
  const curT = periodTotals(data, 30, 0);
  const prevT = periodTotals(data, 60, 30);
  return { rows, top: rows[0], current: curT, previous: prevT };
}

/** Средняя выручка по дням недели за 8 недель */
export function weekdayRevenue(data: BusinessData, now = new Date()) {
  const totals = Array(7).fill(0);
  const days = Array(7).fill(0);
  const seen = new Set<string>();
  for (const t of data.transactions) {
    if (t.type !== "income" || !inRange(t, 56, 0, now)) continue;
    const d = new Date(t.date);
    if (isSameDay(d, now)) continue;
    totals[d.getDay()] += t.amount;
    const key = d.toDateString();
    if (!seen.has(key)) {
      seen.add(key);
      days[d.getDay()] += 1;
    }
  }
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows = order.map((wd) => ({ wd, name: WEEKDAYS_SHORT[wd], value: days[wd] ? Math.round(totals[wd] / days[wd]) : 0 }));
  const open = rows.filter((r) => r.value > 0);
  const avg = open.reduce((s, r) => s + r.value, 0) / Math.max(1, open.length);
  const weakest = open.reduce((m, r) => (r.value < m.value ? r : m), open[0]);
  const dropPct = Math.round(((avg - weakest.value) / avg) * 100);
  return { rows, avg, weakest, dropPct, weakestDat: WEEKDAYS_PLURAL_DAT[weakest.wd] };
}

/** Продажи услуг за 30 дней — для поиска слабого товара */
export function serviceSales(data: BusinessData) {
  return data.services
    .map((s) => {
      const txs = data.transactions.filter((t) => t.type === "income" && t.serviceId === s.id && inRange(t, 30, 0));
      return { id: s.id, name: s.name, count: txs.length, revenue: sum(txs) };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function weakService(data: BusinessData) {
  const p = PROFILES[data.type];
  const svc = data.services[p.weakServiceIndex];
  const sales = serviceSales(data);
  const s = sales.find((x) => x.id === svc.id)!;
  const avgCount = sales.reduce((a, b) => a + b.count, 0) / sales.length;
  return { ...s, price: svc.price, avgCount: Math.round(avgCount), lagPct: Math.round((1 - s.count / avgCount) * 100) };
}

export function sleepingClients(data: BusinessData, days = 30) {
  const now = Date.now();
  return data.clients.filter((c) => c.visits >= 2 && now - new Date(c.lastVisit).getTime() > days * DAY);
}

export function employeeRevenue(data: BusinessData, empId: string) {
  return sum(data.transactions.filter((t) => t.type === "income" && t.employeeId === empId && inRange(t, 30, 0)));
}

export function todayStats(data: BusinessData, now = new Date()) {
  const isToday = (iso: string) => isSameDay(new Date(iso), now);
  const leadsToday = data.conversations.filter((c) => isToday(c.createdAt)).length;
  const agentReplies = data.conversations.reduce((s, c) => s + c.messages.filter((m) => m.from === "agent" && isToday(m.at)).length, 0);
  const repliedClients = data.conversations.filter((c) => c.messages.some((m) => m.from === "agent" && isToday(m.at))).length;
  const invoicesToday = data.documents.filter((d) => d.kind === "invoice" && isToday(d.date)).length + 3;
  const postsToday = data.posts.filter((p) => p.status === "published" && isToday(p.date)).length || 1;
  const dealsToday = data.deals.filter((d) => isToday(d.createdAt)).length;
  const callsToday = data.calls.filter((c) => isToday(c.at)).length;
  return { leadsToday, agentReplies, repliedClients, invoicesToday, postsToday, dealsToday, callsToday };
}

export function dashboardKpis(data: BusinessData) {
  const cur = periodTotals(data, 30, 0);
  const prev = periodTotals(data, 60, 30);
  const today = todayStats(data);
  const closed = data.deals.filter((d) => d.stage === "paid" || d.stage === "lost");
  const paid = data.deals.filter((d) => d.stage === "paid").length;
  const conversion = closed.length ? Math.round((paid / closed.length) * 100) : 0;
  const agentMsgs = data.conversations.reduce((s, c) => s + c.messages.filter((m) => m.from === "agent").length, 0);
  // Экономия: ответы ×3 мин, документы ×15 мин, посты ×40 мин, звонки ×5 мин — экстраполяция на месяц
  const hours = Math.round((agentMsgs * 3 * 12 + data.documents.length * 15 + data.posts.length * 40 + data.calls.length * 5 * 4) / 60);
  return {
    leadsToday: today.leadsToday,
    revenue: cur.income,
    revenueDelta: prev.income ? Math.round(((cur.income - prev.income) / prev.income) * 100) : 0,
    profit: cur.profit,
    conversion,
    responseSec: 11,
    savedHours: hours,
    savedMoney: hours * 2500,
  };
}

export function monthTotals(data: BusinessData, monthIndex: number, year: number) {
  const txs = data.transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === monthIndex && d.getFullYear() === year;
  });
  const income = sum(txs.filter((t) => t.type === "income"));
  const expense = sum(txs.filter((t) => t.type === "expense"));
  const first = txs.length ? new Date(Math.min(...txs.map((t) => new Date(t.date).getTime()))) : null;
  const last = txs.length ? new Date(Math.max(...txs.map((t) => new Date(t.date).getTime()))) : null;
  return { income, expense, profit: income - expense, txs, first, last, label: MONTHS_NOM[monthIndex] };
}

/** Инсайты «Агент заметил» */
export interface Insight {
  id: string;
  title: string;
  text: string;
  action: string;
  href: string;
  tone: "warning" | "info" | "success";
}

export function buildInsights(data: BusinessData): Insight[] {
  const wd = weekdayRevenue(data);
  const ws = weakService(data);
  const drivers = profitDrivers(data);
  const p = PROFILES[data.type];
  const sleeping = sleepingClients(data, 30);
  return [
    {
      id: "weekday",
      title: `Выручка по ${wd.weakestDat} ниже на ${wd.dropPct}%`,
      text: `В среднем ${formatMoney(wd.weakest.value)} против ${formatMoney(wd.avg)} в другие дни. Предлагаю акцию «−15% по ${wd.weakestDat}».`,
      action: "Запустить акцию",
      href: "/marketing?tab=generator&promo=weekday",
      tone: "warning",
    },
    {
      id: "expense",
      title: `«${drivers.top.name}» выросли на ${Math.round(drivers.top.pct)}%`,
      text: `+${formatMoney(drivers.top.delta)} за 30 дней: ${p.spikeReason}.`,
      action: "Разобрать расходы",
      href: "/accounting?ask=profit",
      tone: "info",
    },
    {
      id: "service",
      title: `«${ws.name}» продаётся плохо`,
      text: `${ws.count} продаж за месяц при среднем ${ws.avgCount}. ${sleeping.length} постоянных клиентов не приходили больше месяца — можно предложить им ${p.promoIdea.replace("акция на ", "")}.`,
      action: "Предложить акцию",
      href: "/marketing?tab=generator&promo=service",
      tone: "success",
    },
  ];
}
