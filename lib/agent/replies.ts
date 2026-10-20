import type { BusinessData } from "@/lib/data/types";
import { firstName } from "@/lib/data/names";
import { formatMoney } from "@/lib/utils";
import { genericReplyIn, type AgentLang } from "./i18n";

/** Демо-ответ агента на произвольное сообщение клиента: ищем по FAQ и услугам */
export function genericReply(data: BusinessData, clientText: string, clientName: string, lang: AgentLang = "ru") {
  const t = clientText.toLowerCase();
  const name = firstName(clientName);
  if (lang !== "ru") return genericReplyIn(lang, name, clientText, data.knowledge);

  const svc = data.services.find((s) =>
    s.name
      .toLowerCase()
      .split(/[\s(),]+/)
      .filter((w) => w.length > 4)
      .some((w) => t.includes(w.slice(0, Math.max(5, w.length - 2)))),
  );
  if (svc) {
    return `${name}, ${svc.name.toLowerCase()} стоит ${formatMoney(svc.price)}. Могу предложить ближайшее время сегодня в 17:00 или завтра в 11:00 — что удобнее?`;
  }
  if (/(адрес|где вы|находит|как доех)/.test(t)) return `${name}, мы находимся по адресу: ${data.knowledge.address}. ${data.knowledge.hours}. Ждём вас!`;
  if (/(kaspi|каспи|оплат|карт)/.test(t)) return data.knowledge.faq.find((f) => /kaspi/i.test(f.q))?.a ?? "Принимаем Kaspi QR, Kaspi Red и карты.";
  if (/(график|до скольки|время работы|работаете)/.test(t)) return `${name}, мы работаем: ${data.knowledge.hours.toLowerCase()}.`;
  if (/(спасибо|рахмет|благодар)/.test(t)) return `Пожалуйста, ${name}! Будем рады видеть вас снова 🌸`;
  if (/(скидк|акци)/.test(t)) return `${name}, для новых клиентов действует скидка 10% на первый визит. А по вторникам — специальные цены 😉`;
  if (/(отмен|перенес|перенос)/.test(t)) return `Конечно, ${name}! На какой день и время перенести? Подберу свободное окно.`;
  return `${name}, спасибо за сообщение! Подскажите, пожалуйста, на какую услугу и на какой день вы хотели бы записаться? Помогу подобрать удобное время.`;
}
