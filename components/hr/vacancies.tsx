"use client";

import { useState } from "react";
import { Send, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { AiBadge } from "@/components/shared/ai-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agentPersona } from "@/lib/agent/context";
import { streamText } from "@/lib/ai";
import { vacancyText } from "@/lib/data/templates";
import { cn, formatDate } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";

export function Vacancies() {
  const data = useData();
  const addVacancy = useAppStore((s) => s.addVacancy);
  const addActivity = useAppStore((s) => s.addActivity);
  const [title, setTitle] = useState(data.vacancies[0]?.title ?? "Администратор");
  const [salary, setSalary] = useState("от 250 000 ₸");
  const [details, setDetails] = useState("Нужен человек на вечерние смены, общение с клиентами и запись");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = data.vacancies.find((v) => v.id === openId);

  const generate = async () => {
    setBusy(true);
    const fallback = vacancyText({ title, salary, biz: data.name, address: data.knowledge.address, hours: data.knowledge.hours, details });
    await streamText({
      system: `${agentPersona(data)}\n\nСейчас ты работаешь как HR-менеджер.`,
      messages: [{ role: "user", content: `Составь текст вакансии «${title}», доход: ${salary}. Описание от владельца: ${details}. Структура: заголовок, о нас, обязанности, требования, условия, адрес и как откликнуться. Без markdown, списки через «•».` }],
      fallback,
      maxTokens: 900,
      speed: 0.4,
      onToken: setText,
    });
    setBusy(false);
  };

  const publish = () => {
    addVacancy({ title, salary, status: "open", candidates: 0, createdAt: new Date().toISOString(), text });
    addActivity({ kind: "hr", text: `Опубликовал вакансию «${title}» на hh.kz, Enbek.kz и в Instagram`, href: "/hr" });
    toast.success("Вакансия опубликована", { description: "hh.kz · Enbek.kz · Instagram · Telegram-каналы Тараза (демо)" });
    setText("");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Генерация вакансии <AiBadge />
          </CardTitle>
          <p className="text-xs text-muted-foreground">Опишите должность своими словами — агент напишет вакансию и разместит её</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Должность</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Доход</Label>
              <Input value={salary} onChange={(e) => setSalary(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Кого ищем (своими словами)</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} className="min-h-[60px]" />
          </div>
          <Button variant="ai" onClick={generate} disabled={busy || !title.trim()}>
            <Sparkles className={cn(busy && "animate-spin")} /> {busy ? "Пишу вакансию…" : "Сгенерировать вакансию"}
          </Button>
          {text && (
            <div className="space-y-2 animate-fade-in-up">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} className={cn("min-h-[300px] leading-relaxed", busy && "opacity-90")} />
              <Button onClick={publish} disabled={busy}>
                <Send /> Опубликовать на площадках
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Открытые вакансии</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.vacancies.map((v) => (
            <button key={v.id} onClick={() => setOpenId(v.id)} className="w-full rounded-lg border p-3 text-left transition hover:bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{v.title}</span>
                <Badge variant="success">Открыта</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{v.salary}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> {data.candidates.filter((c) => c.role === v.title).length} кандидатов · с {formatDate(v.createdAt)}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{open?.text}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
