import { PROFILES } from "@/lib/data/profiles";
import type { BusinessData } from "@/lib/data/types";
import {
  dashboardKpis, employeeRevenue, expensesByCategory, incomeByCategory, monthTotals, profitDrivers,
  serviceSales, sleepingClients, todayStats, weakService, weekdayRevenue,
} from "@/lib/analytics";
import { MONTHS_NOM, MONTHS_PREP, formatMoney, plural } from "@/lib/utils";
import { estimateTax } from "./tax";

export interface ChartSpec {
  kind: "bar" | "pie" | "compare";
  title: string;
  data: { name: string; value: number; value2?: number }[];
  labels?: [string, string];
}

export interface AssistantAnswer {
  intent: string;
  text: string;
  chart?: ChartSpec;
}

const MONTH_STEMS = ["январ", "феврал", "март", "апрел", "ма", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"];

function findMonth(q: string): number | null {
  const words = q.toLowerCase().split(/[^а-яё]+/);
  for (let i = MONTH_STEMS.length - 1; i >= 0; i--) {
    const stem = MONTH_STEMS[i];
    if (stem === "ма") {
      if (words.some((w) => w === "май" || w === "мае" || w === "мая")) return 4;
      continue;
    }
    if (words.some((w) => w.startsWith(stem))) return i;
  }
  return null;
}

const has = (q: string, ...keys: string[]) => keys.some((k) => q.includes(k));

/** Определение намерения + демо-ответ с данными. Используется и как fallback для реального ИИ. */
export function answerQuestion(data: BusinessData, question: string): AssistantAnswer {
  const q = question.toLowerCase();
  const p = PROFILES[data.type];
  const now = new Date();

  if (has(q, "съел", "съедает", "расход", "тратим", "потрат", "прибыль упала", "куда уход", "издерж")) {
    const d = profitDrivers(data);
    const top = d.rows.filter((r) => r.delta > 0 && r.pct >= 3).slice(0, 3);
    const extra = top.reduce((s, r) => s + r.delta, 0);
    const profitChange = d.current.profit - d.previous.profit;
    const intro =
      profitChange >= 0
        ? `За последние 30 дней прибыль ${formatMoney(d.current.profit)}. Выручка выросла, но расходы «съели» ${formatMoney(extra)} сверх прошлого месяца — без этого прибыль была бы ${formatMoney(d.current.profit + extra)}.`
        : `За последние 30 дней прибыль ${formatMoney(d.current.profit)} — на ${formatMoney(-profitChange)} меньше, чем месяцем ранее.`;
    return {
      intent: "profit",
      text:
        `${intro}\n\nГлавное, что «съело» прибыль:\n` +
        top.map((r) => `• ${r.name}: ${formatMoney(r.current)} (+${formatMoney(r.delta)}, +${Math.round(r.pct)}%)`).join("\n") +
        `\n\nПричина №1 — «${d.top.name}»: ${p.spikeReason}.\n\nЧто предлагаю:\n• запросить цены у двух альтернативных поставщиков — подготовлю письма;\n• пересчитать себестоимость и поднять цены на 5–7% на самые затратные позиции;\n• не закупать впрок, пока цены не стабилизируются.`,
      chart: {
        kind: "compare",
        title: "Расходы: последние 30 дней vs предыдущие",
        labels: ["Сейчас", "Было"],
        data: d.rows.slice(0, 5).map((r) => ({ name: r.name, value: r.current, value2: r.previous })),
      },
    };
  }

  if (has(q, "налог", "910", "декларац", "кгд", "соцплат", "опв")) {
    const t = estimateTax(data);
    return {
      intent: "tax",
      text: `По упрощённой декларации (форма 910) за ${t.periodLabel}:\n• доход с начала полугодия: ${formatMoney(t.income)}\n• прогноз дохода за полугодие: ${formatMoney(t.projected)}\n• налог ${t.ratePct}% от дохода ≈ ${formatMoney(t.tax)}\n\nБлижайшие сроки:\n${t.deadlines.slice(0, 3).map((d) => `• ${d.date} — ${d.title}`).join("\n")}\n\nНапомню за 5 дней до каждого срока и подготовлю черновик декларации.`,
    };
  }

  const month = findMonth(q);
  if (month !== null || has(q, "заработ", "выручк", "доход", "сколько я", "оборот", "продаж")) {
    if (month !== null) {
      const year = month > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
      const m = monthTotals(data, month, year);
      if (!m.txs.length) {
        return { intent: "revenue", text: `За ${MONTHS_NOM[month]} ${year} у меня нет данных — история в демо охватывает последние 60 дней.` };
      }
      const partial = m.first && m.first.getDate() > 1 ? ` (данные с ${m.first.getDate()} числа)` : month === now.getMonth() ? ` (месяц ещё идёт)` : "";
      const cats = new Map<string, number>();
      m.txs.filter((t) => t.type === "income").forEach((t) => cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount));
      const catRows = [...cats.entries()].sort((a, b) => b[1] - a[1]);
      return {
        intent: "revenue",
        text: `В ${MONTHS_PREP[month]}${partial} вы заработали ${formatMoney(m.income)}.\n• Расходы: ${formatMoney(m.expense)}\n• Чистая прибыль: ${formatMoney(m.profit)} (маржа ${m.income ? Math.round((m.profit / m.income) * 100) : 0}%)\n• Больше всего принесли: ${catRows.slice(0, 2).map(([n, v]) => `${n} — ${formatMoney(v)}`).join(", ")}`,
        chart: { kind: "bar", title: `Доход по направлениям — ${MONTHS_NOM[month]}`, data: catRows.slice(0, 6).map(([name, value]) => ({ name, value })) },
      };
    }
    const k = dashboardKpis(data);
    const inc = incomeByCategory(data, 30);
    return {
      intent: "revenue",
      text: `За последние 30 дней выручка — ${formatMoney(k.revenue)} (${k.revenueDelta >= 0 ? "+" : ""}${k.revenueDelta}% к прошлому периоду), прибыль — ${formatMoney(k.profit)}.\n• Лучшее направление: ${inc[0]?.name} — ${formatMoney(inc[0]?.value ?? 0)}\n• Конверсия заявок в оплату: ${k.conversion}%`,
      chart: { kind: "bar", title: "Доход по направлениям, 30 дней", data: inc.slice(0, 6) },
    };
  }

  if (has(q, "сотрудник", "мастер", "лучш", "персонал", "кто работ", "команд")) {
    const rows = data.employees
      .map((e) => ({ e, rev: employeeRevenue(data, e.id) }))
      .sort((a, b) => b.rev - a.rev);
    const slow = data.employees.reduce((m, e) => (e.responseEvening / e.responseMorning > m.responseEvening / m.responseMorning ? e : m));
    return {
      intent: "staff",
      text: `Лидер по выручке за 30 дней — ${rows[0].e.name} (${formatMoney(rows[0].rev)}).\nЛучший рейтинг у клиентов — ${[...data.employees].sort((a, b) => b.rating - a.rating)[0].name}.\n\nНа что обратить внимание: ${slow.name} отвечает вечером в ${Math.round(slow.responseEvening / slow.responseMorning)} раза медленнее (${slow.responseEvening} мин против ${slow.responseMorning}). Предлагаю передать мне вечерние ответы в мессенджерах.`,
      chart: { kind: "bar", title: "Выручка по сотрудникам, 30 дней", data: rows.filter((r) => r.rev > 0).map((r) => ({ name: r.e.name.split(" ")[0], value: r.rev })) },
    };
  }

  if (has(q, "акци", "маркетинг", "продвиж", "реклам", "клиентов больше", "привлеч", "слаб")) {
    const wd = weekdayRevenue(data);
    const ws = weakService(data);
    return {
      intent: "marketing",
      text: `Вижу две точки роста:\n• ${wd.weakest.name} — самый слабый день: выручка на ${wd.dropPct}% ниже средней. Акция «−15% по ${wd.weakestDat}» может добавить около ${formatMoney(Math.round((wd.avg - wd.weakest.value) * 0.5 * 4))} в месяц.\n• «${ws.name}» — всего ${ws.count} продаж за месяц. Предлагаю ${p.promoIdea} для ${sleepingClients(data).length} «спящих» клиентов.\n\nПодготовить пост и рассылку? Откройте «Маркетинг → Умные акции».`,
      chart: { kind: "bar", title: "Средняя выручка по дням недели", data: wd.rows.map((r) => ({ name: r.name, value: r.value })) },
    };
  }

  if (has(q, "клиент", "заявк", "лид", "сегодня", "воронк")) {
    const t = todayStats(data);
    const stages = ["new", "in_progress", "awaiting_payment"] as const;
    const open = data.deals.filter((d) => (stages as readonly string[]).includes(d.stage));
    return {
      intent: "leads",
      text: `Сегодня ${t.leadsToday} ${plural(t.leadsToday, ["заявка", "заявки", "заявок"])}, я ответил ${t.repliedClients} клиентам — среднее время ответа 11 секунд.\nВ воронке ${open.length} открытых сделок на ${formatMoney(open.reduce((s, d) => s + d.amount, 0))}, из них ожидают оплаты: ${data.deals.filter((d) => d.stage === "awaiting_payment").length}.\nКлиентов в базе: ${data.clients.length}, горячих: ${data.clients.filter((c) => c.temperature === "hot").length}.`,
      chart: {
        kind: "bar",
        title: "Сделки по этапам",
        data: [
          { name: "Новые", value: data.deals.filter((d) => d.stage === "new").length },
          { name: "В работе", value: data.deals.filter((d) => d.stage === "in_progress").length },
          { name: "Ждут оплаты", value: data.deals.filter((d) => d.stage === "awaiting_payment").length },
          { name: "Оплачено", value: data.deals.filter((d) => d.stage === "paid").length },
        ],
      },
    };
  }

  if (has(q, "товар", "услуг", "популяр", "продаётся", "продается")) {
    const s = serviceSales(data);
    return {
      intent: "services",
      text: `Топ-3 за 30 дней:\n${s.slice(0, 3).map((x, i) => `${i + 1}. ${x.name} — ${x.count} продаж, ${formatMoney(x.revenue)}`).join("\n")}\n\nХуже всего: «${s[s.length - 1].name}» — ${s[s.length - 1].count} продаж.`,
      chart: { kind: "bar", title: "Выручка по позициям, 30 дней", data: s.slice(0, 7).map((x) => ({ name: x.name.length > 18 ? x.name.slice(0, 17) + "…" : x.name, value: x.revenue })) },
    };
  }

  // Общая сводка
  const k = dashboardKpis(data);
  const exp = expensesByCategory(data, 30);
  return {
    intent: "overview",
    text: `Коротко о бизнесе за последние 30 дней:\n• выручка ${formatMoney(k.revenue)}, прибыль ${formatMoney(k.profit)}\n• крупнейшая статья расходов — ${exp[0]?.name} (${formatMoney(exp[0]?.value ?? 0)})\n• сегодня ${k.leadsToday} заявок, конверсия ${k.conversion}%\n• я сэкономил команде около ${k.savedHours} часов в этом месяце\n\nСпросите, например: «что съело прибыль?», «сколько я заработал в ${MONTHS_PREP[(now.getMonth() + 11) % 12]}?» или «кто лучший сотрудник?»`,
  };
}

export const SUGGESTED_QUESTIONS = [
  "Что съело прибыль в этом месяце?",
  "Сколько я заработал в прошлом месяце?",
  "Кто лучший сотрудник?",
  "Какую акцию запустить?",
];

export function lastMonthQuestion() {
  const m = (new Date().getMonth() + 11) % 12;
  return `Сколько я заработал в ${MONTHS_PREP[m]}?`;
}
