"use client";

import { useState } from "react";
import { Check, RefreshCw, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { AiBadge } from "@/components/shared/ai-bits";
import { ChannelIcon } from "@/components/shared/channel-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { agentPersona } from "@/lib/agent/context";
import { streamText } from "@/lib/ai";
import type { Mention, Sentiment } from "@/lib/data/types";
import { cn, formatRelative } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";

const SENT: Record<Sentiment, { label: string; variant: "success" | "secondary" | "danger" }> = {
  positive: { label: "Позитив", variant: "success" },
  neutral: { label: "Нейтрально", variant: "secondary" },
  negative: { label: "Негатив", variant: "danger" },
};
const SOURCE_LABEL = { instagram: "Instagram", "2gis": "2ГИС", google: "Google Карты", telegram: "Telegram" };

const ALT_ENDINGS = [
  " Будем рады видеть вас снова!",
  " Спасибо, что помогаете нам становиться лучше 🙏",
  " Если появятся вопросы — пишите нам в WhatsApp, ответим за минуту.",
];

function MentionItem({ m }: { m: Mention }) {
  const data = useData();
  const answer = useAppStore((s) => s.answerMention);
  const [reply, setReply] = useState(m.suggestedReply);
  const [busy, setBusy] = useState(false);
  const [variant, setVariant] = useState(0);

  const regenerate = async () => {
    setBusy(true);
    const next = (variant + 1) % ALT_ENDINGS.length;
    setVariant(next);
    const base = m.suggestedReply.replace(/[.!?😊🙏💖🌸]*$/u, ".");
    await streamText({
      system: agentPersona(data),
      messages: [{ role: "user", content: `Напиши новый короткий вариант публичного ответа на отзыв (${SOURCE_LABEL[m.source]}) от ${m.author}: «${m.text}». Тон: вежливый, тёплый. Без кавычек.` }],
      fallback: base + ALT_ENDINGS[next],
      onToken: setReply,
      maxTokens: 300,
      speed: 0.6,
    });
    setBusy(false);
  };

  return (
    <Card className={cn("p-4 animate-fade-in-up", m.sentiment === "negative" && !m.answered && "border-red-500/30")}>
      <div className="flex items-start gap-3">
        <ChannelIcon id={m.source === "google" ? "website" : m.source} size={30} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{m.author}</span>
            <span className="text-xs text-muted-foreground">
              {SOURCE_LABEL[m.source]} · {formatRelative(m.at)}
            </span>
            {m.rating && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("h-3 w-3", i < m.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                ))}
              </span>
            )}
            <Badge variant={SENT[m.sentiment].variant}>{SENT[m.sentiment].label}</Badge>
            {m.answered && (
              <Badge variant="outline">
                <Check /> Отвечено
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-sm">{m.text}</p>
          {!m.answered && (
            <div className="mt-3 rounded-lg border bg-muted/30 p-3">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <AiBadge /> Ответ подготовлен агентом
              </div>
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-[64px] bg-background" />
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={regenerate} disabled={busy}>
                  <RefreshCw className={cn(busy && "animate-spin")} /> Другой вариант
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    answer(m.id);
                    toast.success(`Ответ опубликован в ${SOURCE_LABEL[m.source]}`, { description: m.author });
                  }}
                >
                  <Send /> Опубликовать ответ
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function Mentions() {
  const data = useData();
  const [filter, setFilter] = useState<Sentiment | "all">("all");
  const list = data.mentions.filter((m) => filter === "all" || m.sentiment === filter);
  const counts = { positive: 0, neutral: 0, negative: 0 } as Record<Sentiment, number>;
  data.mentions.forEach((m) => counts[m.sentiment]++);
  const avgRating = data.mentions.filter((m) => m.rating).reduce((s, m, _, arr) => s + m.rating! / arr.length, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="space-y-3">
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          {(["all", "negative", "neutral", "positive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-xs transition", filter === f ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
            >
              {f === "all" ? `Все (${data.mentions.length})` : `${SENT[f].label} (${counts[f]})`}
            </button>
          ))}
        </div>
        {list.map((m) => (
          <MentionItem key={m.id} m={m} />
        ))}
      </div>
      <Card className="h-fit space-y-4 p-4">
        <div>
          <div className="text-xs text-muted-foreground">Средний рейтинг</div>
          <div className="flex items-center gap-1 text-2xl font-semibold">
            {avgRating.toFixed(1)} <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
        </div>
        {(["positive", "neutral", "negative"] as const).map((s) => (
          <div key={s}>
            <div className="mb-1 flex justify-between text-xs">
              <span>{SENT[s].label}</span>
              <span className="text-muted-foreground">{Math.round((counts[s] / data.mentions.length) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", s === "positive" ? "bg-emerald-500" : s === "neutral" ? "bg-zinc-400" : "bg-red-500")} style={{ width: `${(counts[s] / data.mentions.length) * 100}%` }} />
            </div>
          </div>
        ))}
        <p className="rounded-lg bg-ai/5 p-3 text-xs text-muted-foreground">
          Агент следит за Instagram, 2ГИС, Google Картами и Telegram, определяет тональность и готовит ответ. Негативные отзывы — сразу администратору.
        </p>
      </Card>
    </div>
  );
}
