/**
 * Казахское произношение для синтеза речи:
 * числа, суммы, время, проценты и порядковые → казахские слова с правильными
 * окончаниями (закон сингармонизма). Пример: «12 000 ₸-ден» → «он екі мың теңгеден»,
 * «15:30-ға» → «он бес отызға», «25-іне» → «жиырма бесіне», «12-үй» → «он екінші үй».
 */

const ONES = ["нөл", "бір", "екі", "үш", "төрт", "бес", "алты", "жеті", "сегіз", "тоғыз"];
const TENS = ["", "он", "жиырма", "отыз", "қырық", "елу", "алпыс", "жетпіс", "сексен", "тоқсан"];

function under1000(n: number): string[] {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (h) out.push(...(h === 1 ? ["жүз"] : [ONES[h], "жүз"]));
  if (t) out.push(TENS[t]);
  if (o) out.push(ONES[o]);
  return out;
}

/** 127500 → «жүз жиырма жеті мың бес жүз» */
export function kkNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return "нөл";
  const words: string[] = [];
  const mln = Math.floor(n / 1_000_000);
  const th = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (mln) words.push(...under1000(mln), "миллион");
  if (th) words.push(...(th === 1 ? ["бір", "мың"] : [...under1000(th), "мың"]));
  if (rest) words.push(...under1000(rest));
  return words.join(" ");
}

// ---------------------------------------------------------------- сингармонизм

// «у» и «и» нейтральны по ряду («елу» — мягкое слово), поэтому при выборе окончания их пропускаем
const BACK = "аоұыя";
const FRONT = "әеөүіэ";
const VOWELS = BACK + FRONT + "уиёю";
const VOICELESS = "птқксшфхцчщ";
const NASAL = "мнң";

function isBack(word: string) {
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i].toLowerCase();
    if (BACK.includes(ch)) return true;
    if (FRONT.includes(ch)) return false;
  }
  return true;
}

function lastSound(word: string): "vowel" | "nasal" | "voiceless" | "voiced" {
  const ch = word[word.length - 1]?.toLowerCase() ?? "а";
  if (VOWELS.includes(ch)) return "vowel";
  if (NASAL.includes(ch)) return "nasal";
  if (VOICELESS.includes(ch)) return "voiceless";
  return "voiced";
}

type Case = "dat" | "loc" | "abl" | "possDat" | "poss" | "acc" | "gen" | "ins";

const CASE_OF: Record<string, Case> = {
  ға: "dat", ге: "dat", қа: "dat", ке: "dat",
  да: "loc", де: "loc", та: "loc", те: "loc",
  дан: "abl", ден: "abl", тан: "abl", тен: "abl", нан: "abl", нен: "abl",
  ына: "possDat", іне: "possDat", сына: "possDat", сіне: "possDat",
  ы: "poss", і: "poss", сы: "poss", сі: "poss",
  ды: "acc", ді: "acc", ты: "acc", ті: "acc", ны: "acc", ні: "acc",
  дың: "gen", дің: "gen", тың: "gen", тің: "gen", ның: "gen", нің: "gen",
  мен: "ins", бен: "ins", пен: "ins",
};

/** Окончание падежа, согласованное с последним словом */
function suffix(word: string, c: Case): string {
  const back = isBack(word);
  const s = lastSound(word);
  switch (c) {
    case "dat":
      return s === "voiceless" ? (back ? "қа" : "ке") : back ? "ға" : "ге";
    case "loc":
      return s === "voiceless" ? (back ? "та" : "те") : back ? "да" : "де";
    case "abl":
      return s === "voiceless" ? (back ? "тан" : "тен") : s === "nasal" ? (back ? "нан" : "нен") : back ? "дан" : "ден";
    case "possDat":
      return s === "vowel" ? (back ? "сына" : "сіне") : back ? "ына" : "іне";
    case "poss":
      return s === "vowel" ? (back ? "сы" : "сі") : back ? "ы" : "і";
    case "acc":
      return s === "vowel" ? (back ? "ны" : "ні") : s === "voiceless" ? (back ? "ты" : "ті") : back ? "ды" : "ді";
    case "gen":
      return s === "vowel" || s === "nasal" ? (back ? "ның" : "нің") : s === "voiceless" ? (back ? "тың" : "тің") : back ? "дың" : "дің";
    case "ins":
      return s === "voiceless" ? "пен" : s === "nasal" || /[зж]$/i.test(word) ? "бен" : "мен";
  }
}

/** Порядковое: «он екі» → «он екінші» */
function ordinal(words: string): string {
  const parts = words.split(" ");
  const last = parts.pop()!;
  const back = isBack(last);
  const end = lastSound(last) === "vowel" ? (back ? "ншы" : "нші") : back ? "ыншы" : "інші";
  return [...parts, last + end].join(" ");
}

/** Приклеить окончание (по записанному суффиксу) к последнему слову фразы */
function attach(phrase: string, writtenSuffix: string | undefined): string {
  if (!writtenSuffix) return phrase;
  const c = CASE_OF[writtenSuffix.toLowerCase()];
  if (!c) return `${phrase}${writtenSuffix}`;
  const last = phrase.split(" ").pop()!;
  return c === "ins" ? `${phrase} ${suffix(last, c)}` : phrase + suffix(last, c);
}

// ---------------------------------------------------------------- нормализация текста

/** Бренды и сокращения для казахской речи (окончание после дефиса пересогласуется) */
const BRANDS: [RegExp, string][] = [
  [/к-сі/g, "көшесі"],
  [/Тараз қ\./g, "Тараз қаласы"],
  [/ш\/а/g, "шағынауданы"],
  [/Aru Beauty/g, "Ару Бьюти"],
  [/Ayana Home/g, "Аяна Хоум"],
  [/Hyundai Accent/g, "Хёндэ Акцент"],
  [/WhatsApp/g, "Ватсап"],
  [/Instagram/g, "Инстаграм"],
  [/Telegram/g, "Телеграм"],
  [/Kaspi/g, "Каспи"],
  [/2ГИС/g, "екі гис"],
  [/(?<![А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ])ЖИ(?![А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ])/g, "жасанды интеллект"],
];

const toInt = (s: string) => Number(s.replace(/[\s  ]/g, ""));
const WORD = "[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһA-Za-z]+";

export function kkSpeech(text: string): string {
  let s = text;
  for (const [re, to] of BRANDS) s = s.replace(re, to);
  // Бренд/слово + «-окончание»: «Ватсап-қа» → «Ватсапқа»
  s = s.replace(new RegExp(`(${WORD})-(${WORD})`, "g"), (m, w: string, suf: string) => (CASE_OF[suf.toLowerCase()] ? attach(w, suf) : m));

  // Размеры шин и предметов
  s = s.replace(/R(\d+)[–-]R(\d+)/g, (_, a, b) => `эр ${kkNumber(+a)} мен эр ${kkNumber(+b)}`);
  s = s.replace(/(\d+)×(\d+)/g, (_, a, b) => `${attach(kkNumber(+a), "ға")} ${kkNumber(+b)}`);

  // Суммы: «22 000 ₸-ден», «12 000 ₸», «8 500 теңгеден»
  s = s.replace(new RegExp(`(\\d[\\d\\s\\u00A0\\u202F]*\\d|\\d)\\s?₸(?:-(${WORD}))?`, "g"), (_, num: string, suf?: string) => attach(`${kkNumber(toInt(num))} теңге`, suf));

  // Время: «15:30-ға» → «он бес отызға», «10:00» → «он»
  s = s.replace(new RegExp(`\\b(\\d{1,2}):(\\d{2})(?:-(${WORD}))?`, "g"), (_, h: string, m: string, suf?: string) => {
    const phrase = m === "00" ? kkNumber(+h) : `${kkNumber(+h)} ${kkNumber(+m)}`;
    return attach(phrase, suf);
  });

  // Проценты, диапазоны, «1,5»
  s = s.replace(/(\d+)\s?%/g, (_, n) => `${kkNumber(+n)} пайыз`);
  s = s.replace(/(\d+)[–—](\d+)/g, (_, a, b) => `${kkNumber(+a)}-${kkNumber(+b)}`);
  s = s.replace(/(\d+),5\b/g, (_, n) => `${kkNumber(+n)} жарым`);

  // Число с окончанием или порядковое с существительным: «25-іне», «12-үй», «12-үйге»
  s = s.replace(new RegExp(`(\\d[\\d\\s\\u00A0\\u202F]*\\d|\\d)-(${WORD})`, "g"), (_, num: string, rest: string) => {
    const words = kkNumber(toInt(num));
    if (CASE_OF[rest.toLowerCase()]) return attach(words, rest);
    return `${ordinal(words)} ${rest}`;
  });

  // Остальные числа (в том числе с пробелами-разделителями тысяч)
  s = s.replace(/\d{1,3}(?:[\s  ]\d{3})+|\d+/g, (num) => kkNumber(toInt(num)));

  // «он мен он бес» → «он бен он бес»: союз «мен/бен/пен» после числительного
  const numWords = new Set([...ONES, ...TENS.filter(Boolean), "жүз", "мың", "миллион"]);
  s = s.replace(new RegExp(`(${WORD}) (мен|бен|пен)(?=\\s)`, "g"), (m, w: string) => (numWords.has(w.toLowerCase()) ? `${w} ${suffix(w, "ins")}` : m));
  return s;
}

// ---------------------------------------------------------------- для русского голоса

/**
 * Если на устройстве нет казахского голоса, текст читает русский.
 * Заменяем казахские буквы на ближайшие по звучанию русские:
 * «сәлем» → «сялем», «көмек» → «кёмек», «күн» → «кюн».
 */
export function kkForRussianVoice(text: string): string {
  const map: Record<string, [string, string]> = {
    ә: ["э", "я"],
    ө: ["ё", "ё"],
    ү: ["у", "ю"],
    ұ: ["у", "у"],
    і: ["и", "и"],
    қ: ["к", "к"],
    ғ: ["г", "г"],
    ң: ["н", "н"],
    һ: ["х", "х"],
  };
  return text.replace(/[әөүұіқғңһӘӨҮҰІҚҒҢҺ]/g, (ch, offset: number, full: string) => {
    const lower = ch.toLowerCase();
    const prev = full[offset - 1] ?? " ";
    const atStart = !/[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(prev);
    const afterVowel = /[аоуыэяёюеиәөүұі]/i.test(prev);
    const [start, inner] = map[lower];
    const out = atStart || afterVowel ? start : inner;
    return ch === lower ? out : out.toUpperCase();
  });
}
