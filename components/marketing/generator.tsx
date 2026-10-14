"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Copy, RefreshCw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AiBadge } from "@/components/shared/ai-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { POST_TYPES, TONES, contentPrompt, generateContent, splitHashtags, type Tone } from "@/lib/agent/content";
import { agentPersona } from "@/lib/agent/context";
import { streamText } from "@/lib/ai";
import type { PostType } from "@/lib/data/types";
import { formatDate } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";
import { PostPreview } from "./post-preview";

export function ContentGenerator({ initialTopic, autoGenerate }: { initialTopic?: string | null; autoGenerate?: boolean }) {
  const data = useData();
  const addPost = useAppStore((s) => s.addPost);
  const addActivity = useAppStore((s) => s.addActivity);
  const [type, setType] = useState<PostType>(initialTopic ? "promo" : "instagram");
  const [topic, setTopic] = useState(initialTopic ?? "Осенние новинки");
  const [tone, setTone] = useState<Tone>("friendly");
  const [text, setText] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const autoRef = useRef(false);

  const generate = async (t = topic) => {
    setBusy(true);
    setPublished(false);
    setHashtags([]);
    const demo = generateContent(data, { type, topic: t, tone });
    const fallback = demo.hashtags.length ? `${demo.text}\n\n${demo.hashtags.join(" ")}` : demo.text;
    const raw = await streamText({
      system: `${agentPersona(data)}\n\nСейчас ты работаешь как SMM-маркетолог.`,
      messages: [{ role: "user", content: contentPrompt({ type, topic: t, tone }) }],
      fallback,
      maxTokens: 800,
      speed: 0.55,
      onToken: (s) => setText(splitHashtags(s).text),
    });
    const parsed = splitHashtags(raw);
    setText(parsed.text);
    setHashtags(parsed.hashtags);
    setBusy(false);
  };

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
    if (autoGenerate && initialTopic && !autoRef.current) {
      const t = setTimeout(() => {
        autoRef.current = true;
        void generate(initialTopic);
      }, 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopic, autoGenerate]);

  const publish = () => {
    addPost({ date: new Date().toISOString(), type, title: topic, text, hashtags, status: "published", reach: 0, likes: 0, byAgent: true });
    addActivity({ kind: "post", text: `Опубликовал «${topic}» в Instagram`, href: "/marketing?tab=plan" });
    setPublished(true);
    toast.success(type === "ad" ? "Объявление опубликовано" : "Опубликовано в Instagram", {
      description: type === "ad" ? "Размещено в OLX и чатах района (демо)" : `${data.knowledge.instagram} · агент ответит на комментарии`,
    });
  };

  const schedule = () => {
    const taken = new Set(data.posts.map((p) => new Date(p.date).toDateString()));
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    do d.setDate(d.getDate() + 1);
    while (taken.has(d.toDateString()));
    addPost({ date: d.toISOString(), type, title: topic, text, hashtags, status: "planned", byAgent: true });
    toast.success("Добавлено в контент-план", { description: `${formatDate(d)}, 19:00` });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Генератор контента <AiBadge />
          </CardTitle>
          <p className="text-xs text-muted-foreground">Агент знает ваши услуги, цены, адрес и стиль — текст сразу готов к публикации</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
            <div className="grid gap-1.5">
              <Label>Тип</Label>
              <Select value={type} onValueChange={(v) => setType(v as PostType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Тон</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Тема</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Например: скидка 15% по вторникам" />
              <Button variant="ai" onClick={() => generate()} disabled={busy || !topic.trim()}>
                {busy ? <RefreshCw className="animate-spin" /> : <Sparkles />} {text ? "Ещё вариант" : "Сгенерировать"}
              </Button>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Текст</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[220px] leading-relaxed" placeholder="Нажмите «Сгенерировать» — агент напишет текст" />
            {hashtags.length > 0 && <div className="text-xs text-sky-600 dark:text-sky-400">{hashtags.join(" ")}</div>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button onClick={publish} className="col-span-2 sm:col-span-1" disabled={!text || busy || published}>
              <Send /> {published ? "Опубликовано" : "Опубликовать"}
            </Button>
            <Button variant="outline" onClick={schedule} disabled={!text || busy}>
              <CalendarPlus /> В контент-план
            </Button>
            <Button
              variant="ghost"
              disabled={!text}
              onClick={() => {
                void navigator.clipboard?.writeText(`${text}\n\n${hashtags.join(" ")}`).catch(() => undefined);
                toast.success("Текст скопирован");
              }}
            >
              <Copy /> Копировать
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Превью</div>
        <PostPreview text={text} hashtags={hashtags} type={type} title={topic} streaming={busy} />
      </div>
    </div>
  );
}
