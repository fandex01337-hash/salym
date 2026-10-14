import type { BusinessData, Candidate } from "@/lib/data/types";
import { firstName } from "@/lib/data/names";

export interface InterviewTurn {
  who: "ai" | "candidate";
  text: string;
}

/** Сценарий ИИ-собеседования: вопросы агента и ответы кандидата (по уровню скоринга) */
export function interviewScript(data: BusinessData, c: Candidate): InterviewTurn[] {
  const strong = c.score >= 80;
  const mid = c.score >= 60 && c.score < 80;
  const name = firstName(c.name);
  const biz = data.name;
  const pick = (s: string, m: string, w: string) => (strong ? s : mid ? m : w);

  return [
    { who: "ai", text: `Здравствуйте, ${name}! Я Салым, ИИ-ассистент «${biz}». Проведу короткое собеседование на позицию «${c.role}» — 4 вопроса, около 5 минут. Готовы?` },
    { who: "candidate", text: "Здравствуйте! Да, давайте начнём." },
    { who: "ai", text: "Расскажите о своём опыте: где работали и чем занимались?" },
    {
      who: "candidate",
      text: pick(
        `${c.experience}. Есть постоянные клиенты, своя база и портфолио. Слежу за трендами, прохожу обучение пару раз в год.`,
        `${c.experience}. Опыт есть, но в основном без команды. Хочу расти в профессиональном месте.`,
        `${c.experience}. Опыта пока мало, но я быстро учусь и очень хочу работать.`,
      ),
    },
    { who: "ai", text: "Клиент недоволен результатом и повышает голос. Ваши действия?" },
    {
      who: "candidate",
      text: pick(
        "Сначала выслушаю и извинюсь, уточню, что именно не так. Предложу исправить бесплатно сразу или в удобное время, и сообщу администратору.",
        "Постараюсь успокоить, предложу переделать. Если не получится — позову администратора.",
        "Наверное, позову администратора, пока не знаю, как в таких случаях лучше.",
      ),
    },
    { who: "ai", text: "Какой график вам удобен и готовы ли работать в вечерние смены и по выходным?" },
    {
      who: "candidate",
      text: pick("Да, могу 2/2 или 5/2, вечера и выходные не проблема.", "В основном удобно днём, но пару вечеров в неделю могу.", "Только по вечерам после учёбы, выходные не всегда."),
    },
    { who: "ai", text: "Последний вопрос: почему именно мы?" },
    {
      who: "candidate",
      text: pick(
        `Знаю по отзывам о «${biz}», нравится уровень сервиса и то, что запись автоматизирована — больше времени на клиентов.`,
        "Близко к дому и хорошие отзывы в 2ГИС.",
        "Ищу любую работу в этой сфере, у вас открыта вакансия.",
      ),
    },
    { who: "ai", text: `Спасибо, ${name}! Собеседование завершено. Я подготовлю отчёт для руководителя, ответ придёт в WhatsApp в течение дня.` },
  ];
}

export function interviewReport(c: Candidate) {
  const base = c.score;
  const clamp = (v: number) => Math.max(20, Math.min(98, Math.round(v)));
  const criteria = [
    { name: "Опыт и навыки", value: clamp(base + 2) },
    { name: "Работа с клиентами", value: clamp(base - 4 + (base > 80 ? 6 : 0)) },
    { name: "Мотивация", value: clamp(base + 5) },
    { name: "Гибкость графика", value: clamp(base - 8 + (base > 70 ? 10 : 0)) },
  ];
  const total = Math.round(criteria.reduce((s, x) => s + x.value, 0) / criteria.length);
  const verdict = total >= 80 ? "Рекомендую пригласить на пробный день" : total >= 60 ? "Можно рассмотреть, нужна стажировка" : "Не рекомендую на текущую позицию";
  return { criteria, total, verdict };
}
