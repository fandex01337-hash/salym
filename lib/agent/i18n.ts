import type { BusinessType, TranscriptLine } from "@/lib/data/types";

/**
 * Язык, на котором агент общается с КЛИЕНТАМИ (звонки, чаты, собеседования).
 * Интерфейс и отчёты для владельца остаются на русском.
 * Казахские тексты стоит проверить носителю языка перед публичным показом.
 */
export type AgentLang = "ru" | "kk" | "en";

export const AGENT_LANGS: { id: AgentLang; short: string; label: string; native: string }[] = [
  { id: "ru", short: "РУС", label: "Русский", native: "Русский" },
  { id: "kk", short: "ҚАЗ", label: "Казахский", native: "Қазақша" },
  { id: "en", short: "ENG", label: "Английский", native: "English" },
];

export const LANG_IN: Record<AgentLang, string> = { ru: "на русском", kk: "на казахском", en: "на английском" };
export const LANG_PROMPT: Record<AgentLang, string> = {
  ru: "Отвечай клиенту на русском языке.",
  kk: "Отвечай клиенту только на казахском языке (қазақ тілі), грамотно и вежливо, обращайся на «Сіз».",
  en: "Reply to the client only in English, warm and concise.",
};

export interface IncomingText {
  first: string;
  followUp: string;
  reply1: string;
  reply2: string;
}

interface ProfileTexts {
  incoming: IncomingText[];
  liveCall: TranscriptLine[];
}

const ai = (text: string): TranscriptLine => ({ who: "ai", text });
const cl = (text: string): TranscriptLine => ({ who: "client", text });

// ---------------------------------------------------------------- казахский

const KK: Record<BusinessType, ProfileTexts> = {
  beauty: {
    incoming: [
      {
        first: "Сәлеметсіз бе! Ертеңге гель-лакпен маникюрге жазылғым келеді, бос уақыт бар ма?",
        followUp: "Керемет, сағат 15:00-ке жазыңыз!",
        reply1: "Сәлеметсіз бе, {name}! 😊 Ертең 12:00, 15:00 және 18:30-да бос уақыт бар. Гель-лакпен маникюр — 7 000 ₸, шамамен 1,5 сағат. Сізге қай уақыт ыңғайлы?",
        reply2: "Сізді ертең сағат 15:00-ке {master} шеберге жаздым 💅 Мекенжай: Тараз қ., Төле би к-сі, 82. Бір күн бұрын еске саламын. Төлемді орнында немесе Kaspi арқылы жасауға болады.",
      },
      {
        first: "Қайырлы күн, шаш бояу қанша тұрады? Осы сенбіде келгім келеді",
        followUp: "11:00-ге жазыңызшы",
        reply1: "Қайырлы күн, {name}! Шаш бояу 22 000 ₸-ден басталады — бағасы шаштың ұзындығы мен техникаға байланысты. Сенбіде колорист Ольгада 11:00 және 15:00 бос. Қай уақытқа жазайын?",
        reply2: "Дайын! Сенбі, 11:00, колорист Ольга ✨ Шашыңызды 1–2 күн жумай келгеніңіз дұрыс.",
      },
      {
        first: "Сәлем! Кірпік ламинациясын жасайсыздар ма? Қанша уақыт алады?",
        followUp: "Тамаша, бүгін кешке болады ма?",
        reply1: "Сәлем, {name}! Иә, кірпік ламинациясы — 10 000 ₸, шамамен 1 сағат, әсері 6–8 аптаға сақталады 😍 Уақыт таңдап берейін бе?",
        reply2: "Бүгін 19:00-да Асель бос — сізді жаздым! Мекенжай: Төле би к-сі, 82. Күтеміз 🌸",
      },
      {
        first: "Сәлеметсіз бе, жұмаға шаш қидыру мен сәндеуге жазылуға бола ма?",
        followUp: "17:00 ыңғайлы",
        reply1: "Сәлеметсіз бе, {name}! Жұмада 13:00 және 17:00 бос. Шаш қидыру — 6 000 ₸, сәндеумен бірге — 11 000 ₸. Қашан ыңғайлы?",
        reply2: "Жұма, 17:00, Ольгаға жаздым ✂️ Бір күн бұрын еске саламын. Кешіңіз жақсы өтсін!",
      },
    ],
    liveCall: [
      ai("Aru Beauty салоны, сәлеметсіз бе! Менің атым Салым. Сізге қалай көмектесе аламын?"),
      cl("Сәлеметсіз бе! Кірпік ұзартуға жазылғым келеді."),
      ai("Қуана көмектесемін! Кірпік ұзарту 12 000 теңге тұрады, шамамен екі сағат алады. Сізге қай күн ыңғайлы?"),
      cl("Осы сенбіде уақыт бар ма?"),
      ai("Сенбіде Асель шеберде 10:00 және 15:30-да бос уақыт бар."),
      cl("15:30 болсын. Жеңілдік бар ма?"),
      ai("Жаңа клиенттерге алғашқы келуге 10% жеңілдік бар. Барлығы 10 800 теңге."),
      cl("Керемет, жазыңыз."),
      ai("Сізді сенбіге, сағат 15:30-ға Асельге жаздым. Растау мен мекенжайды WhatsApp-қа жіберемін. Күніңіз сәтті өтсін!"),
    ],
  },
  cafe: {
    incoming: [
      {
        first: "Сәлеметсіз бе! Жұма күні 10 адамға туған күн тойлағымыз келеді. Қанша тұрады?",
        followUp: "Керемет, 19:00-ға брондаңыз",
        reply1: "Сәлеметсіз бе, {name}! 🎉 10 адамға банкет — 85 000 ₸: салаттар, бешбармақ, кәуап, сусындар және туған күн иесіне сыйлық торт. Жұмада 18:00-ден бастап бос. Қай уақытқа брондайын?",
        reply2: "Жұма, 19:00, 10 қонаққа брондадым ✅ Растау үшін 30% алдын ала төлем қажет — Kaspi сілтемесін жібердім. Әкімші {master} сізді қарсы алады!",
      },
      {
        first: "Қайырлы күн, 3 адамға комбо-жиынтық жеткізуге тапсырыс беруге бола ма?",
        followUp: "Иә, Астана шағынауданы, 12-үй",
        reply1: "Қайырлы күн, {name}! Әрине. Комбо-жиынтық: палау, манты, салат және шай — 6 500 ₸. Жеткізу мекенжайын айтасыз ба?",
        reply2: "Қабылдадым! Астана шағынауданы, 12-үйге шамамен 40 минутта жеткіземіз 🚗 Kaspi арқылы төлем сілтемесін жібердім.",
      },
      {
        first: "Сәлем! Бүгінгі бизнес-ланчта не бар?",
        followUp: "Екі адамға 13:00-ке брондаңыз",
        reply1: "Сәлем, {name}! Бүгінгі бизнес-ланч: кеспе көже, палау, салат және компот — 2 500 ₸ 🍲 12:00-ден 15:00-ке дейін береміз.",
        reply2: "Екі адамға 13:00-ке үстел брондадым ✅ Келгеніңізге ланч дайын болады!",
      },
    ],
    liveCall: [
      ai("«Шаңырақ» кафесі, сәлеметсіз бе! Менің атым Салым. Сізге қалай көмектесе аламын?"),
      cl("Сәлеметсіз бе! Мерейтойға банкет тапсырыс бергіміз келеді, шамамен 15 адам."),
      ai("Құттықтаймын! Банкет мәзірі бір қонаққа 8 500 теңгеден: салаттар, бешбармақ, кәуап, шай және десерт. Қай күнге?"),
      cl("25-іне, сенбі күні."),
      ai("25-інде зал 17:00-ден бастап бос. 15 қонаққа барлығы шамамен 127 500 теңге."),
      cl("Тортты өзіміз әкелсек бола ма?"),
      ai("Иә, қосымша ақысыз. Брондау үшін Kaspi арқылы 30% алдын ала төлем қажет."),
      cl("Жақсы, брондаңыз."),
      ai("Залды 25-іне, 17:00-ге брондадым. Алдын ала төлем сілтемесі мен мәзірді WhatsApp-қа жібердім. Рақмет!"),
    ],
  },
  shop: {
    incoming: [
      {
        first: "Сәлеметсіз бе! 6 адамға арналған ыдыс жиынтығы әлі бар ма? Бүгін алып кеткім келеді",
        followUp: "Иә, сақтап қойыңызшы, 18:00-де келемін",
        reply1: "Сәлеметсіз бе, {name}! Иә, 6 адамға арналған жиынтық бар — 32 000 ₸, ақ және графит түстері бар 🍽 Сізге сақтап қояйын ба?",
        reply2: "Жиынтықты 20:00-ға дейін сіздің атыңызға сақтап қойдым ✅ «Арай» сауда орталығында, Абай к-сі, 140-та күтеміз. Төлем Kaspi немесе карта арқылы.",
      },
      {
        first: "Қайырлы күн, анама мерейтойға сыйлық керек, бюджет 20 мыңға дейін",
        followUp: "Сыйлық қорабы жарайды, жеткізуді рәсімдеңіз",
        reply1: "Қайырлы күн, {name}! 🎁 15 000 ₸ тұратын сыйлық қорабын ұсынамын: плед, хош иісті шам және қолдан жасалған саптыаяқ. Немесе 18 500 ₸ тұратын сатин төсек жабдығы. Қайсысы ұнайды?",
        reply2: "Сыйлық қорабын мерекелік орамамен жеткізуге рәсімдедім 🎀 Курьер бүгін 19:00-ға дейін жеткізеді. Kaspi арқылы төлем сілтемесін жібердім.",
      },
      {
        first: "Сәлем, ортопедиялық жастықтар бар ма? Қандай өлшемдері бар?",
        followUp: "50×70 өлшемді 2 дана аламын",
        reply1: "Сәлем, {name}! Иә, 50×70 және 40×60 ортопедиялық жастықтар бар, екеуі де 14 000 ₸. Қай өлшем керек?",
        reply2: "50×70 өлшемді 2 жастық рәсімдедім — 28 000 ₸. Ертең тегін жеткіземіз 🚚",
      },
    ],
    liveCall: [
      ai("Ayana Home, сәлеметсіз бе! Менің атым Салым. Сізге қалай көмектесе аламын?"),
      cl("Сәлеметсіз бе, үйлену тойына сыйлық іздеп жүрмін, үйге арналған бір нәрсе."),
      ai("Тамаша себеп! 24 000 теңгелік шай сервизі мен 32 000 теңгелік алты адамға арналған ыдыс жиынтығы сұранысқа ие."),
      cl("Орап беруге бола ма?"),
      ai("Иә, мерекелік орау тегін. Сыйлыққа ашықхат та береміз."),
      cl("Онда сервиз. Ертең жеткізесіздер ме?"),
      ai("Иә, ертең 12:00 мен 16:00 аралығында. Kaspi төлем сілтемесін WhatsApp-қа жіберемін."),
      cl("Керемет, рақмет!"),
      ai("Тапсырыс рәсімделді. Ayana Home дүкенін таңдағаныңызға рақмет!"),
    ],
  },
  auto: {
    incoming: [
      {
        first: "Сәлеметсіз бе! Hyundai Accent көлігінің тежегіш қалыптарын ауыстыру керек, қашан болады?",
        followUp: "Ертең 11:00-де келейін",
        reply1: "Сәлеметсіз бе, {name}! Алдыңғы тежегіш қалыптарын ауыстыру — қалыптарымен бірге 15 000 ₸. Ертең 11:00 және 16:00 бос 🔧 Қашан ыңғайлы?",
        reply2: "Ертең 11:00-ге {master} шеберге жаздым. Шамамен бір сағат алады. Мекенжай: Тараз қ., Сүлейменов к-сі, 21.",
      },
      {
        first: "Қайырлы күн, қозғалтқыш шамы жанып тұр, бүгін диагностикаға бола ма?",
        followUp: "15:00-те боламын",
        reply1: "Қайырлы күн, {name}! Компьютерлік диагностика — 8 000 ₸, шамамен 30 минут. Бүгін 15:00 және 18:00 бос.",
        reply2: "Бүгін 15:00-ке диагност Дмитрийге жаздым ✅ Жөндеу 50 000 ₸-ден асатын болса, алдын ала хабарласамыз.",
      },
      {
        first: "Сәлем! Қысқы дөңгелекке ауыстыру қанша тұрады? Осы сенбіде келгім келеді",
        followUp: "Таңғы 10-да болсын",
        reply1: "Сәлеметсіз бе, {name}! R15–R17 төрт дөңгелекті ауыстыру — 10 000 ₸. Сенбіде 10:00 және 14:00 бос.",
        reply2: "Сенбі, 10:00-ға Сергейге жаздым. Жазғы дөңгелектерді сақтауға қалдыруға болады — маусымына 8 000 ₸ 🛞",
      },
    ],
    liveCall: [
      ai("Жол Сервис, сәлеметсіз бе! Менің атым Салым. Сізге қалай көмектесе аламын?"),
      cl("Сәлеметсіз бе, Камри көлігімнің тежегіштері сықырлайды."),
      ai("Тежегіш қалыптары тозған болуы мүмкін. Алдыңғы қалыптарды ауыстыру — қосалқы бөлшектерімен 15 000 теңге."),
      cl("Бүгін болады ма?"),
      ai("Бүгін 17:00-де Қанат шеберде бос уақыт бар. Жұмыс шамамен бір сағат алады."),
      cl("Жарайды. Дискілерді де тексересіздер ме?"),
      ai("Иә, тегін тексереміз, егер жону керек болса, бағасын алдын ала айтамыз."),
      cl("Жақсы, жазыңыз."),
      ai("Сізді 17:00-ге жаздым. Мекенжай мен жол сызбасын WhatsApp-қа жібердім. Кездескенше!"),
    ],
  },
};

// ---------------------------------------------------------------- английский

const EN: Record<BusinessType, ProfileTexts> = {
  beauty: {
    incoming: [
      {
        first: "Hi! I'd like to book a gel manicure for tomorrow — do you have any free slots?",
        followUp: "Great, let's do 3 pm!",
        reply1: "Hello, {name}! 😊 Tomorrow we have free slots at 12:00, 15:00 and 18:30. A gel manicure is 7,000 ₸ and takes about 1.5 hours. What time suits you?",
        reply2: "You're booked for tomorrow at 15:00 with {master} 💅 Address: 82 Tole Bi St, Taraz. I'll send you a reminder the day before. You can pay on site or via Kaspi.",
      },
      {
        first: "Good afternoon, how much is hair colouring? I'd like to come this Saturday",
        followUp: "Let's do 11 am",
        reply1: "Good afternoon, {name}! Colouring starts at 22,000 ₸ — the final price depends on hair length and technique. On Saturday our colourist Olga is free at 11:00 and 15:00. Which time shall I book?",
        reply2: "Done! Saturday, 11:00 with Olga ✨ Please come with hair unwashed for 1–2 days.",
      },
      {
        first: "Hi! Do you do lash lamination? How long does it take?",
        followUp: "Perfect, can I come tonight?",
        reply1: "Hi, {name}! Yes — lash lamination is 10,000 ₸, takes about an hour and lasts 6–8 weeks 😍 Shall I find you a slot?",
        reply2: "Asel is free tonight at 19:00 — you're booked! Address: 82 Tole Bi St. See you soon 🌸",
      },
      {
        first: "Hello, can I book a haircut and styling for Friday?",
        followUp: "5 pm works",
        reply1: "Hello, {name}! On Friday we have 13:00 and 17:00. A haircut is 6,000 ₸, with styling 11,000 ₸. When works for you?",
        reply2: "Booked for Friday at 17:00 with Olga ✂️ I'll remind you a day before. Have a nice evening!",
      },
    ],
    liveCall: [
      ai("Aru Beauty, hello! My name is Salym. How can I help you?"),
      cl("Hi! I'd like to book eyelash extensions."),
      ai("With pleasure! Lash extensions are 12,000 tenge and take about two hours. Which day suits you?"),
      cl("Do you have anything this Saturday?"),
      ai("On Saturday our lash artist Asel is free at 10 am and 3:30 pm."),
      cl("Let's do 3:30. Do you have any discounts?"),
      ai("New clients get 10% off their first visit. That's 10,800 tenge in total."),
      cl("Great, please book me in."),
      ai("You're booked for Saturday at 3:30 pm with Asel. I'll send the confirmation and address to your WhatsApp. Have a great day!"),
    ],
  },
  cafe: {
    incoming: [
      {
        first: "Hello! We'd like to celebrate a birthday for 10 people on Friday. How much would it cost?",
        followUp: "Great, please book it for 7 pm",
        reply1: "Hello, {name}! 🎉 A banquet for 10 is 85,000 ₸: salads, beshbarmak, shashlik, drinks and a cake for the birthday person on us. Friday is free from 18:00. What time shall I book?",
        reply2: "Booked: Friday, 19:00, 10 guests ✅ To confirm we need a 30% prepayment — I've sent you a Kaspi link. Our host {master} will meet you!",
      },
      {
        first: "Good afternoon, can I order a combo set for 3 people for delivery?",
        followUp: "Yes, Astana microdistrict, building 12",
        reply1: "Good afternoon, {name}! Of course. The combo set — plov, manty, salad and tea — is 6,500 ₸. What's the delivery address?",
        reply2: "Got it! We'll deliver to Astana microdistrict, building 12 in about 40 minutes 🚗 I've sent you a Kaspi payment link.",
      },
      {
        first: "Hi! What's in today's business lunch?",
        followUp: "Please book a table for two at 1 pm",
        reply1: "Hi, {name}! Today's business lunch: noodle soup, plov, salad and compote — 2,500 ₸ 🍲 Served from 12:00 to 15:00.",
        reply2: "Table for two booked at 13:00 ✅ Your lunch will be ready when you arrive!",
      },
    ],
    liveCall: [
      ai("Shanyrak café, hello! My name is Salym. How can I help you?"),
      cl("Hello! We'd like to book a banquet for an anniversary, about 15 people."),
      ai("Congratulations! The banquet menu starts at 8,500 tenge per guest: salads, beshbarmak, shashlik, tea and dessert. Which date?"),
      cl("The 25th, a Saturday."),
      ai("On the 25th the hall is free from 5 pm. For 15 guests the total is about 127,500 tenge."),
      cl("Can we bring our own cake?"),
      ai("Yes, with no extra charge. To book, we need a 30% prepayment via Kaspi."),
      cl("Fine, please book it."),
      ai("The hall is booked for the 25th at 5 pm. I've sent the prepayment link and the menu to your WhatsApp. Thank you!"),
    ],
  },
  shop: {
    incoming: [
      {
        first: "Hello! Do you still have the dinnerware set for 6? I'd like to pick it up today",
        followUp: "Yes, please hold it, I'll come at 6 pm",
        reply1: "Hello, {name}! Yes, the set for 6 is in stock — 32,000 ₸, in white and graphite 🍽 Shall I hold one for you?",
        reply2: "I've reserved the set in your name until 20:00 ✅ See you at Aray mall, 140 Abai St. You can pay by Kaspi or card.",
      },
      {
        first: "Good afternoon, I need a gift for my mum's anniversary, budget up to 20 thousand",
        followUp: "The gift box works, please arrange delivery",
        reply1: "Good afternoon, {name}! 🎁 I'd suggest our 15,000 ₸ gift box: a throw blanket, a scented candle and a handmade mug. Or a satin bedding set for 18,500 ₸. Which do you prefer?",
        reply2: "Delivery of the gift box with festive wrapping is arranged 🎀 The courier will bring it today before 19:00. I've sent you a Kaspi payment link.",
      },
      {
        first: "Hi, do you have orthopedic pillows? What sizes?",
        followUp: "I'll take two of the 50×70",
        reply1: "Hi, {name}! Yes, orthopedic pillows in 50×70 and 40×60, both 14,000 ₸. Which size do you need?",
        reply2: "Two 50×70 pillows ordered — 28,000 ₸. Free delivery tomorrow 🚚",
      },
    ],
    liveCall: [
      ai("Ayana Home, hello! My name is Salym. How can I help you?"),
      cl("Hello, I'm looking for a wedding gift, something for the home."),
      ai("What a lovely occasion! Our most popular picks are a tea set for 24,000 and a dinnerware set for six for 32,000 tenge."),
      cl("Can you gift-wrap it?"),
      ai("Yes, festive wrapping is free, and we'll add a greeting card too."),
      cl("Then the tea set. Can you deliver tomorrow?"),
      ai("Yes, tomorrow between 12 and 4 pm. I'll send a Kaspi payment link to your WhatsApp."),
      cl("Perfect, thank you!"),
      ai("Your order is placed. Thank you for choosing Ayana Home!"),
    ],
  },
  auto: {
    incoming: [
      {
        first: "Hello! I need to replace the brake pads on a Hyundai Accent — when can you do it?",
        followUp: "Tomorrow at 11 then",
        reply1: "Hello, {name}! Replacing the front brake pads is 15,000 ₸ including parts. Tomorrow we're free at 11:00 and 16:00 🔧 What suits you?",
        reply2: "Booked for tomorrow at 11:00 with {master}. It takes about an hour. Address: 21 Suleimenov St, Taraz.",
      },
      {
        first: "Good afternoon, my check engine light is on — can I come for diagnostics today?",
        followUp: "I'll be there at 3 pm",
        reply1: "Good afternoon, {name}! Computer diagnostics is 8,000 ₸ and takes about 30 minutes. Today we have 15:00 and 18:00.",
        reply2: "Booked for today at 15:00 with our diagnostician Dmitry ✅ If the repair exceeds 50,000 ₸, we'll call you first.",
      },
      {
        first: "Hi! How much is a winter tyre change? I'd like to come this Saturday",
        followUp: "10 am please",
        reply1: "Hello, {name}! Changing four R15–R17 tyres is 10,000 ₸. On Saturday we have 10:00 and 14:00.",
        reply2: "Booked for Saturday at 10:00 with Sergey. We can also store your summer tyres — 8,000 ₸ per season 🛞",
      },
    ],
    liveCall: [
      ai("Zhol Service, hello! My name is Salym. How can I help you?"),
      cl("Hello, the brakes on my Camry are squeaking."),
      ai("Most likely the pads are worn. Replacing the front pads is 15,000 tenge including parts."),
      cl("Can you do it today?"),
      ai("Today our mechanic Kanat is free at 5 pm. The job takes about an hour."),
      cl("That works. Will you check the discs too?"),
      ai("Yes, we'll check them for free, and if they need resurfacing we'll tell you the price in advance."),
      cl("Okay, book me in."),
      ai("You're booked for 5 pm. I've sent the address and directions to your WhatsApp. See you soon!"),
    ],
  },
};

const TEXTS: Record<Exclude<AgentLang, "ru">, Record<BusinessType, ProfileTexts>> = { kk: KK, en: EN };

/** Тексты на выбранном языке; для русского — null (используются исходные профили) */
export function localized(lang: AgentLang, type: BusinessType): ProfileTexts | null {
  return lang === "ru" ? null : TEXTS[lang][type];
}

// ---------------------------------------------------------------- собеседование

export interface InterviewStrings {
  hello: (name: string, biz: string, role: string) => string;
  ready: string;
  q1: string;
  a1: [string, string, string];
  q2: string;
  a2: [string, string, string];
  q3: string;
  a3: [string, string, string];
  q4: string;
  a4: (biz: string) => [string, string, string];
  bye: (name: string) => string;
}

export const INTERVIEW: Record<Exclude<AgentLang, "ru">, InterviewStrings> = {
  kk: {
    hello: (name, biz) => `Сәлеметсіз бе, ${name}! Мен — Салым, «${biz}» компаниясының ЖИ-көмекшісімін. Осы лауазымға қысқа сұхбат өткіземін — 4 сұрақ, шамамен 5 минут. Дайынсыз ба?`,
    ready: "Сәлеметсіз бе! Иә, бастайық.",
    q1: "Тәжірибеңіз туралы айтып беріңізші: қайда жұмыс істедіңіз және немен айналыстыңыз?",
    a1: [
      "Бірнеше жыл салонда жұмыс істедім. Тұрақты клиенттерім, өз базам және портфолиом бар. Трендтерді қадағалаймын, жылына екі рет оқудан өтемін.",
      "Тәжірибем бар, бірақ көбіне жеке жұмыс істедім. Кәсіби командада өскім келеді.",
      "Тәжірибем әзірге аз, бірақ тез үйренемін және жұмыс істегім келеді.",
    ],
    q2: "Клиент нәтижеге көңілі толмай, дауысын көтерді. Не істейсіз?",
    a2: [
      "Алдымен тыңдап, кешірім сұраймын, нақты не ұнамағанын анықтаймын. Бірден немесе ыңғайлы уақытта тегін түзетуді ұсынамын және әкімшіге хабарлаймын.",
      "Тыныштандыруға тырысамын, қайта жасауды ұсынамын. Болмаса, әкімшіні шақырамын.",
      "Әкімшіні шақырамын, мұндай жағдайда не істеу керегін әлі білмеймін.",
    ],
    q3: "Сізге қандай кесте ыңғайлы, кешкі ауысымда және демалыс күндері жұмыс істей аласыз ба?",
    a3: ["Иә, ауысыммен де, бес күндік кестемен де жұмыс істей аламын, кешкі уақыт пен демалыс күндері мәселе емес.", "Көбіне күндіз ыңғайлы, бірақ аптасына екі кеш жұмыс істей аламын.", "Тек оқудан кейін кешке, демалыс күндері әрдайым емес."],
    q4: "Соңғы сұрақ: неге дәл бізді таңдадыңыз?",
    a4: (biz) => [
      `«${biz}» туралы пікірлерді білемін, қызмет деңгейі ұнайды, жазылу автоматтандырылған — клиенттерге көбірек уақыт қалады.`,
      "Үйге жақын және 2ГИС-те пікірлер жақсы.",
      "Осы саладан кез келген жұмыс іздеп жүрмін, сізде бос орын ашық.",
    ],
    bye: (name) => `Рақмет, ${name}! Сұхбат аяқталды. Басшыға есеп дайындаймын, жауап бүгін WhatsApp-қа келеді.`,
  },
  en: {
    hello: (name, biz) => `Hello, ${name}! I'm Salym, the AI assistant at ${biz}. I'll run a short interview for this position — 4 questions, about 5 minutes. Ready?`,
    ready: "Hello! Yes, let's start.",
    q1: "Tell me about your experience: where have you worked and what did you do?",
    a1: [
      "I've worked in a salon for several years. I have regular clients, my own client base and a portfolio. I follow the trends and take training courses twice a year.",
      "I have experience, but mostly working on my own. I'd like to grow in a professional team.",
      "I don't have much experience yet, but I learn fast and I really want to work.",
    ],
    q2: "A client is unhappy with the result and raises their voice. What do you do?",
    a2: [
      "First I listen and apologise, then find out exactly what's wrong. I offer to fix it for free right away or at a convenient time, and I let the manager know.",
      "I try to calm them down and offer to redo it. If that doesn't work, I call the manager.",
      "I'd probably call the manager — I'm not sure yet what's best in such cases.",
    ],
    q3: "What schedule suits you, and can you work evening shifts and weekends?",
    a3: ["Yes, I can do two-on-two or five-two, evenings and weekends are no problem.", "Daytime suits me best, but I can do a couple of evenings a week.", "Only evenings after my studies, and not always at weekends."],
    q4: "Last question: why us?",
    a4: (biz) => [
      `I know ${biz} from the reviews — I like the level of service, and booking is automated, so there's more time for clients.`,
      "It's close to home and has good reviews on 2GIS.",
      "I'm looking for any job in this field, and you have an opening.",
    ],
    bye: (name) => `Thank you, ${name}! The interview is complete. I'll prepare a report for the manager, and you'll get an answer on WhatsApp today.`,
  },
};

// ---------------------------------------------------------------- подсказки менеджеру

export function genericReplyIn(lang: Exclude<AgentLang, "ru">, name: string, text: string, biz: { address: string; hours: string }) {
  const t = text.toLowerCase();
  if (lang === "kk") {
    if (/(мекенжай|қайда|адрес)/.test(t)) return `${name}, біз мына мекенжайда орналасқанбыз: ${biz.address}. Сізді күтеміз!`;
    if (/(рақмет|рахмет|спасибо)/.test(t)) return `Оқасы жоқ, ${name}! Сізді қайта күтеміз 🌸`;
    if (/(баға|қанша|тұрады)/.test(t)) return `${name}, нақты баға қызмет түріне байланысты. Қай қызмет қызықтырады? Бәрін айтып беремін.`;
    return `${name}, хабарламаңызға рақмет! Қай қызметке және қай күнге жазылғыңыз келеді? Ыңғайлы уақытты таңдап беремін.`;
  }
  if (/(address|where|located)/.test(t)) return `${name}, we're located at ${biz.address}. See you soon!`;
  if (/(thank|thanks)/.test(t)) return `You're welcome, ${name}! We look forward to seeing you again 🌸`;
  if (/(price|cost|how much)/.test(t)) return `${name}, the exact price depends on the service. Which one are you interested in? I'll walk you through it.`;
  return `${name}, thanks for your message! Which service and which day would you like to book? I'll find you a convenient time.`;
}
