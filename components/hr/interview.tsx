"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck, Play, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { AgentAvatar, AiBadge, TypingDots } from "@/components/shared/ai-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, Progress } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { interviewReport, interviewScript, type InterviewTurn } from "@/lib/agent/hr";
import { simulateTyping } from "@/lib/ai";
import { cn, sleep } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";
import { ScoreRing } from "./candidates";

export function Interview({ candidateId, onCandidateChange }: { candidateId: string | null; onCandidateChange: (id: string) => void }) {
  const data = useData();
  const setStatus = useAppStore((s) => s.setCandidateStatus);
  const addActivity = useAppStore((s) => s.addActivity);
  const cand = data.candidates.find((c) => c.id === candidateId) ?? [...data.candidates].sort((a, b) => b.score - a.score)[0];
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [typing, setTyping] = useState<{ who: InterviewTurn["who"]; text: string } | null>(null);
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const runRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    runRef.current++;
    setTurns([]);
    setTyping(null);
    setState("idle");
  }, [cand.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, typing]);

  const start = async () => {
    const run = ++runRef.current;
    setTurns([]);
    setState("running");
    setStatus(cand.id, "interview");
    for (const t of interviewScript(data, cand)) {
      if (runRef.current !== run) return;
      setTyping({ who: t.who, text: "" });
      await sleep(t.who === "ai" ? 400 : 900);
      await simulateTyping(t.text, (s) => runRef.current === run && setTyping({ who: t.who, text: s }), { speed: t.who === "ai" ? 0.5 : 0.65 });
      if (runRef.current !== run) return;
      setTyping(null);
      setTurns((prev) => [...prev, t]);
      await sleep(350);
    }
    setState("done");
    addActivity({ kind: "hr", text: `Провёл ИИ-собеседование с ${cand.name} и подготовил отчёт`, href: "/hr?tab=interview" });
  };

  const report = interviewReport(cand);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Card className="flex h-[calc(100dvh-56px-76px-150px)] min-h-[460px] flex-col md:h-[calc(100dvh-230px)] md:min-h-[520px]">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b pb-3">
          <div className="flex items-center gap-3">
            <AgentAvatar size={32} pulse={state === "running"} />
            <div>
              <CardTitle className="flex items-center gap-2">
                ИИ-собеседование <AiBadge />
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Агент задаёт вопросы в Telegram или WhatsApp и оценивает ответы</p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Select value={cand.id} onValueChange={onCandidateChange}>
              <SelectTrigger className="min-w-0 flex-1 sm:w-56 sm:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...data.candidates]
                  .sort((a, b) => b.score - a.score)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.score}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button variant={state === "idle" ? "ai" : "outline"} onClick={start} disabled={state === "running"}>
              {state === "done" ? <RotateCcw /> : <Play />} {state === "done" ? "Заново" : "Начать"}
            </Button>
          </div>
        </CardHeader>
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4 scrollbar-thin">
          {state === "idle" && !turns.length && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <AgentAvatar size={44} />
              <p className="max-w-sm">
                Нажмите «Начать» — агент проведёт собеседование с <b className="text-foreground">{cand.name}</b> на позицию «{cand.role}» по готовому сценарию.
              </p>
            </div>
          )}
          {[...turns, ...(typing ? [{ ...typing, typing: true }] : [])].map((t, i) => {
            const ai = t.who === "ai";
            const isTyping = "typing" in t;
            return (
              <div key={i} className={cn("flex items-end gap-2 animate-fade-in-up", !ai && "flex-row-reverse")}>
                {ai ? <AgentAvatar size={26} /> : <Avatar name={cand.name} size={26} />}
                <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm", ai ? "rounded-bl-sm bg-ai/10 ring-1 ring-ai/20" : "rounded-br-sm bg-card")}>
                  {isTyping && !t.text ? <TypingDots /> : <span className={cn(isTyping && "typing-caret")}>{t.text}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Отчёт для руководителя</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <ScoreRing score={state === "done" ? report.total : cand.score} size={60} />
            <div>
              <div className="font-semibold">{cand.name}</div>
              <div className="text-xs text-muted-foreground">{cand.role}</div>
              <div className="text-xs text-muted-foreground">{state === "done" ? "Оценка после собеседования" : "Скоринг резюме"}</div>
            </div>
          </div>
          {state === "done" ? (
            <div className="space-y-3 animate-fade-in-up">
              {report.criteria.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{c.name}</span>
                    <span className="tabular-nums text-muted-foreground">{c.value}/100</span>
                  </div>
                  <Progress value={c.value} indicatorClassName={c.value >= 80 ? "bg-emerald-500" : c.value >= 60 ? "bg-amber-500" : "bg-red-500"} />
                </div>
              ))}
              <div className={cn("rounded-lg p-3 text-sm font-medium", report.total >= 80 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : report.total >= 60 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-red-500/10 text-red-700 dark:text-red-400")}>
                {report.verdict}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setStatus(cand.id, "invited");
                    toast.success("Приглашение отправлено", { description: `${cand.name} · пробный день завтра в 11:00` });
                  }}
                >
                  <CalendarCheck /> Пригласить
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus(cand.id, "rejected");
                    toast("Отправлен вежливый отказ", { description: cand.name });
                  }}
                >
                  <X /> Отказ
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{state === "running" ? "Агент проводит собеседование…" : cand.verdict}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
