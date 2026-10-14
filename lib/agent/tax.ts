import type { BusinessData } from "@/lib/data/types";
import { MONTHS_GEN, MONTHS_NOM } from "@/lib/utils";

/**
 * Упрощённый расчёт налога для ИП на упрощённой декларации (форма 910), Казахстан.
 * Демо-оценка: базовая ставка 4% от дохода (НК РК 2026, маслихат может изменить ставку на ±50%).
 * Отчётный период — полугодие; декларация до 15 числа второго месяца после полугодия,
 * оплата — до 25 числа второго месяца после полугодия.
 */
export const TAX_RATE = 0.04;

export interface TaxDeadline {
  date: string;
  iso: string;
  title: string;
  kind: "declaration" | "payment" | "social";
  amount?: number;
}

export function estimateTax(data: BusinessData, now = new Date()) {
  const year = now.getFullYear();
  const h2 = now.getMonth() >= 6;
  const periodStart = new Date(year, h2 ? 6 : 0, 1);
  const periodEnd = new Date(year, h2 ? 11 : 5, h2 ? 31 : 30, 23, 59);
  const periodLabel = h2 ? `2-е полугодие ${year}` : `1-е полугодие ${year}`;

  // Средний дневной доход по имеющейся истории (60 дней)
  const incomes = data.transactions.filter((t) => t.type === "income");
  const oldest = incomes.reduce((m, t) => Math.min(m, new Date(t.date).getTime()), now.getTime());
  const historyDays = Math.max(1, Math.round((now.getTime() - oldest) / 86400000));
  const total = incomes.reduce((s, t) => s + t.amount, 0);
  const avgDaily = total / historyDays;

  const daysPassed = Math.max(1, Math.round((now.getTime() - periodStart.getTime()) / 86400000));
  const daysTotal = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000);
  const income = Math.round(avgDaily * daysPassed);
  const projected = Math.round(avgDaily * daysTotal);
  const tax = Math.round(projected * TAX_RATE);

  const socialMonthly = Math.round((data.employees.length * 85000 * 0.21) / 100) * 100; // ОПВ, СО, ВОСМС, ИПН — оценка

  const declMonth = h2 ? 1 : 7;
  const declYear = h2 ? year + 1 : year;
  const deadlines: TaxDeadline[] = [];
  // Ближайшие соцплатежи — 25 число
  for (let k = 0; k < 3; k++) {
    const d = new Date(year, now.getMonth() + (now.getDate() > 25 ? 1 : 0) + k, 25);
    deadlines.push({ iso: d.toISOString(), date: `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`, title: `Соцплатежи и ИПН за сотрудников за ${MONTHS_NOM[(d.getMonth() + 11) % 12]}`, kind: "social", amount: socialMonthly });
  }
  const decl = new Date(declYear, declMonth, 15);
  const pay = new Date(declYear, declMonth, 25);
  deadlines.push({ iso: decl.toISOString(), date: `15 ${MONTHS_GEN[declMonth]} ${declYear}`, title: `Сдать форму 910 за ${periodLabel}`, kind: "declaration" });
  deadlines.push({ iso: pay.toISOString(), date: `25 ${MONTHS_GEN[declMonth]} ${declYear}`, title: `Оплатить налог по форме 910`, kind: "payment", amount: tax });
  deadlines.sort((a, b) => a.iso.localeCompare(b.iso));

  return { periodLabel, income, projected, tax, ratePct: TAX_RATE * 100, socialMonthly, deadlines, periodStart, periodEnd };
}
