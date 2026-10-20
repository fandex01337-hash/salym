import { employeeRevenue } from "../analytics";
import { estimateTax } from "../agent/tax";
import { PROFILES } from "../data/profiles";
import type { BusinessData, Transaction } from "../data/types";
import { MONTHS_NOM, formatDate, startOfDay } from "../utils";

/** Данные отчёта о заработке — общие для страницы «Отчёты» и Excel-файла */

export type ReportPeriod = "30d" | "month" | "prevMonth" | "all";

export const REPORT_PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "30d", label: "30 дней" },
  { id: "month", label: "Этот месяц" },
  { id: "prevMonth", label: "Прошлый месяц" },
  { id: "all", label: "Вся история" },
];

interface Range {
  from: Date;
  to: Date;
  label: string;
  prev: { from: Date; to: Date } | null;
}

export function periodRange(period: ReportPeriod, data: BusinessData, now = new Date()): Range {
  const endOfToday = new Date(startOfDay(now).getTime() + 86400000 - 1);
  if (period === "30d") {
    const from = startOfDay(new Date(now.getTime() - 29 * 86400000));
    return { from, to: endOfToday, label: "последние 30 дней", prev: { from: new Date(from.getTime() - 30 * 86400000), to: new Date(from.getTime() - 1) } };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { from, to: endOfToday, label: `${MONTHS_NOM[now.getMonth()]} ${now.getFullYear()} (по сегодня)`, prev: { from: prevFrom, to: new Date(from.getTime() - 1) } };
  }
  if (period === "prevMonth") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, -1);
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { from, to, label: `${MONTHS_NOM[from.getMonth()]} ${from.getFullYear()}`, prev: { from: prevFrom, to: new Date(from.getTime() - 1) } };
  }
  const oldest = data.transactions.reduce((m, t) => Math.min(m, new Date(t.date).getTime()), now.getTime());
  return { from: startOfDay(new Date(oldest)), to: endOfToday, label: "вся история", prev: null };
}

const within = (t: Transaction, from: Date, to: Date) => {
  const d = new Date(t.date).getTime();
  return d >= from.getTime() && d <= to.getTime();
};

function totalsOf(txs: Transaction[]) {
  const incomeTx = txs.filter((t) => t.type === "income");
  const income = incomeTx.reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return { income, expense, profit: income - expense, sales: incomeTx.length, avgCheck: incomeTx.length ? income / incomeTx.length : 0, margin: income ? (income - expense) / income : 0 };
}

export type ReportTotals = ReturnType<typeof totalsOf>;

export function buildReport(data: BusinessData, period: ReportPeriod, now = new Date()) {
  const range = periodRange(period, data, now);
  const txs = data.transactions.filter((t) => within(t, range.from, range.to)).sort((a, b) => a.date.localeCompare(b.date));
  const prevTxs = range.prev ? data.transactions.filter((t) => within(t, range.prev!.from, range.prev!.to)) : [];
  const totals = totalsOf(txs);
  const prevTotals = range.prev ? totalsOf(prevTxs) : null;
  const clients = new Map(data.clients.map((c) => [c.id, c.name]));
  const staff = new Map(data.employees.map((e) => [e.id, e.name]));
  const newClients = data.clients.filter((c) => {
    const d = new Date(c.createdAt).getTime();
    return d >= range.from.getTime() && d <= range.to.getTime();
  }).length;

  // По дням
  const dayMap = new Map<string, { date: Date; income: number; expense: number; sales: number }>();
  for (let d = startOfDay(range.from); d <= range.to; d = new Date(d.getTime() + 86400000)) {
    dayMap.set(d.toDateString(), { date: new Date(d), income: 0, expense: 0, sales: 0 });
  }
  for (const t of txs) {
    const row = dayMap.get(new Date(t.date).toDateString());
    if (!row) continue;
    if (t.type === "income") {
      row.income += t.amount;
      row.sales += 1;
    } else row.expense += t.amount;
  }
  const days = [...dayMap.values()];

  // По месяцам
  const monthMap = new Map<string, { label: string; income: number; expense: number }>();
  for (const t of txs) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const row = monthMap.get(key) ?? { label: `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`, income: 0, expense: 0 };
    if (t.type === "income") row.income += t.amount;
    else row.expense += t.amount;
    monthMap.set(key, row);
  }
  const months = [...monthMap.values()];

  // Услуги
  const services = data.services
    .map((s) => {
      const list = txs.filter((t) => t.type === "income" && t.serviceId === s.id);
      return { name: s.name, category: s.category, count: list.length, revenue: list.reduce((a, t) => a + t.amount, 0) };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // Расходы по категориям (+ прошлый период)
  const expCats = new Map<string, { category: string; amount: number; prev: number }>();
  for (const t of txs.filter((x) => x.type === "expense")) {
    const row = expCats.get(t.category) ?? { category: t.category, amount: 0, prev: 0 };
    row.amount += t.amount;
    expCats.set(t.category, row);
  }
  for (const t of prevTxs.filter((x) => x.type === "expense")) {
    const row = expCats.get(t.category) ?? { category: t.category, amount: 0, prev: 0 };
    row.prev += t.amount;
    expCats.set(t.category, row);
  }
  const expenses = [...expCats.values()].sort((a, b) => b.amount - a.amount);

  // Сотрудники
  const team = data.employees
    .map((e) => {
      const list = txs.filter((t) => t.type === "income" && t.employeeId === e.id);
      return {
        name: e.name,
        role: e.role,
        shift: e.shift,
        revenue: list.reduce((a, t) => a + t.amount, 0),
        sales: list.length,
        conversion: e.conversion / 100,
        rating: e.rating,
        responseMin: e.responseMin,
        revenue30: employeeRevenue(data, e.id),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const operations = [...txs].reverse().map((t) => ({
    date: new Date(t.date),
    type: t.type === "income" ? "Доход" : "Расход",
    category: t.category,
    description: t.description,
    client: t.clientId ? clients.get(t.clientId) ?? "" : "",
    employee: t.employeeId ? staff.get(t.employeeId) ?? "" : "",
    amount: t.type === "income" ? t.amount : -t.amount,
  }));

  const docKind = { invoice: "Счёт на оплату", act: "Акт выполненных работ", waybill: "Накладная" } as const;
  const docStatus = { paid: "Оплачен", sent: "Отправлен", draft: "Черновик" } as const;
  const documents = data.documents
    .filter((d) => {
      const t = new Date(d.date).getTime();
      return t >= range.from.getTime() && t <= range.to.getTime();
    })
    .map((d) => ({ number: d.number, kind: docKind[d.kind], counterparty: d.counterparty, date: new Date(d.date), total: d.total, status: docStatus[d.status], byAgent: d.byAgent }));

  return {
    meta: {
      business: data.name,
      typeLabel: PROFILES[data.type].label,
      city: data.city,
      owner: data.owner,
      periodLabel: range.label,
      from: range.from,
      to: range.to,
      fromText: formatDate(range.from, { withYear: true }),
      toText: formatDate(range.to < now ? range.to : now, { withYear: true }),
      generatedAt: now,
      hasPrev: !!range.prev,
    },
    totals: { ...totals, newClients },
    prevTotals,
    days,
    months,
    services,
    expenses,
    team,
    operations,
    documents,
    tax: estimateTax(data, now),
  };
}

export type Report = ReturnType<typeof buildReport>;
