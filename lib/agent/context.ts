import { PROFILES } from "@/lib/data/profiles";
import type { BusinessData } from "@/lib/data/types";
import { dashboardKpis, employeeRevenue, profitDrivers, serviceSales, sleepingClients, weakService, weekdayRevenue } from "@/lib/analytics";
import { formatMoney } from "@/lib/utils";

const TONES = { friendly: "дружелюбный, тёплый, с умеренными эмодзи", formal: "вежливый и официальный, без эмодзи", casual: "простой и неформальный, на «ты»" };

/** Общая «память» агента о бизнесе — передаётся модели как часть системного промпта */
export function businessContext(data: BusinessData) {
  const p = PROFILES[data.type];
  const k = dashboardKpis(data);
  const drivers = profitDrivers(data);
  const wd = weekdayRevenue(data);
  const ws = weakService(data);
  const top = serviceSales(data).slice(0, 3);
  const staff = data.employees
    .map((e) => `${e.name} (${e.role}): выручка 30 дн. ${formatMoney(employeeRevenue(data, e.id))}, ответ утром ${e.responseMorning} мин / вечером ${e.responseEvening} мин, рейтинг ${e.rating}`)
    .join("\n");

  return `Бизнес: ${data.name} (${p.label}), ${data.knowledge.address}. Владелец: ${data.owner}.
График: ${data.knowledge.hours}. Телефон: ${data.knowledge.phone}. Instagram: ${data.knowledge.instagram}.
Сегодня: ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", weekday: "long" })}.

Услуги и цены:
${data.services.map((s) => `- ${s.name}: ${formatMoney(s.price)} (${s.category})`).join("\n")}

Правила бизнеса:
${data.knowledge.rules.map((r) => `- ${r}`).join("\n")}

FAQ:
${data.knowledge.faq.map((f) => `- ${f.q} → ${f.a}`).join("\n")}

Финансы за последние 30 дней: доход ${formatMoney(drivers.current.income)}, расход ${formatMoney(drivers.current.expense)}, прибыль ${formatMoney(drivers.current.profit)}.
Предыдущие 30 дней: доход ${formatMoney(drivers.previous.income)}, расход ${formatMoney(drivers.previous.expense)}, прибыль ${formatMoney(drivers.previous.profit)}.
Изменения расходов по категориям: ${drivers.rows.map((r) => `${r.name} ${formatMoney(r.current)} (было ${formatMoney(r.previous)})`).join("; ")}.
Причина роста «${p.spikeCategory}»: ${p.spikeReason}.
Самый слабый день недели: ${wd.weakest.name} — в среднем ${formatMoney(wd.weakest.value)}, это на ${wd.dropPct}% ниже среднего (${formatMoney(wd.avg)}).
Топ продаж: ${top.map((t) => `${t.name} — ${formatMoney(t.revenue)}`).join(", ")}. Хуже всего продаётся: ${ws.name} (${ws.count} продаж за месяц).
Заявок сегодня: ${k.leadsToday}. Конверсия сделок: ${k.conversion}%. Клиентов в базе: ${data.clients.length}, «спящих» (не были >30 дней): ${sleepingClients(data).length}.

Сотрудники:
${staff}`;
}

export function agentPersona(data: BusinessData) {
  return `Ты — «Салым», ИИ-сотрудник бизнеса «${data.name}». Ты одновременно администратор, бухгалтер, маркетолог и HR. У тебя общая память о бизнесе (ниже). Отвечай по-русски, кратко и по делу, с конкретными цифрами из данных. Никогда не выдумывай цифры, которых нет в данных. Не используй markdown-заголовки и таблицы; списки — короткими строками с «•».

${businessContext(data)}`;
}

export function clientChatPrompt(data: BusinessData, clientName: string, channel: string) {
  return `Ты — «Салым», ИИ-администратор «${data.name}». Ты переписываешься с клиентом ${clientName} в ${channel}.
Тон: ${TONES[data.knowledge.tone]}. Пиши коротко, 1–3 предложения, как живой администратор в мессенджере. Предлагай конкретное время и записывай клиента. Соблюдай правила бизнеса. Цены — только из списка.
Сегодня ${new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}.

Адрес: ${data.knowledge.address}. График: ${data.knowledge.hours}.
Услуги: ${data.services.map((s) => `${s.name} — ${formatMoney(s.price)}`).join("; ")}.
Правила: ${data.knowledge.rules.join("; ")}.
FAQ: ${data.knowledge.faq.map((f) => `${f.q} ${f.a}`).join(" ")}
Мастера/сотрудники: ${data.employees.filter((e) => e.serves).map((e) => `${e.name.split(" ")[0]} (${e.role})`).join(", ")}.`;
}
