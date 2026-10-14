"use client";

import { useState } from "react";
import { Check, Mic, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import type { Candidate } from "@/lib/data/types";
import { cn, formatRelative } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";

const STATUS: Record<Candidate["status"], { label: string; variant: "info" | "ai" | "success" | "danger" }> = {
  new: { label: "Новый", variant: "info" },
  interview: { label: "Собеседование", variant: "ai" },
  invited: { label: "Приглашён", variant: "success" },
  rejected: { label: "Отказ", variant: "danger" },
};

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "hsl(152 60% 42%)" : score >= 60 ? "hsl(35 92% 50%)" : "hsl(0 72% 55%)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={5} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={5} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">{score}</span>
    </div>
  );
}

export function Candidates({ onInterview }: { onInterview: (id: string) => void }) {
  const data = useData();
  const setStatus = useAppStore((s) => s.setCandidateStatus);
  const [role, setRole] = useState<string>("all");
  const roles = [...new Set(data.candidates.map((c) => c.role))];
  const list = data.candidates.filter((c) => role === "all" || c.role === role).sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {["all", ...roles].map((r) => (
          <button key={r} onClick={() => setRole(r)} className={cn("rounded-full border px-3 py-1 text-xs transition", role === r ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
            {r === "all" ? `Все (${data.candidates.length})` : r}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">Скоринг резюме — ИИ, по требованиям вакансии</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((c) => (
          <Card key={c.id} className={cn("p-4 animate-fade-in-up", c.status === "rejected" && "opacity-60")}>
            <div className="flex gap-3">
              <ScoreRing score={c.score} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar name={c.name} size={22} />
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.age} лет</span>
                  <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {c.role} · {c.experience} · {c.source} · {formatRelative(c.appliedAt)}
                </div>
                <p className="mt-2 text-sm">{c.verdict}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.strengths.map((s) => (
                    <Badge key={s} variant="success">
                      <Check /> {s}
                    </Badge>
                  ))}
                  {c.risks.map((s) => (
                    <Badge key={s} variant="warning">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant={c.score >= 80 ? "ai" : "outline"} onClick={() => onInterview(c.id)}>
                    <Mic /> ИИ-собеседование
                  </Button>
                  {c.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setStatus(c.id, "rejected");
                        toast("Кандидату отправлен вежливый отказ", { description: c.name });
                      }}
                    >
                      <X /> Отклонить
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
