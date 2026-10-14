"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AiBadge } from "@/components/shared/ai-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateContent, POST_TYPES } from "@/lib/agent/content";
import { PROFILES } from "@/lib/data/profiles";
import type { Post, PostType } from "@/lib/data/types";
import { MONTHS_NOM, cn, formatDate, formatNumber, isSameDay, sleep } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";
import { PostPreview } from "./post-preview";

const TYPE_STYLE: Record<PostType, string> = {
  instagram: "bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300",
  stories: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  ad: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  promo: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  review: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
};
const TYPE_SHORT: Record<PostType, string> = { instagram: "Пост", stories: "Сторис", ad: "Объявл.", promo: "Реклама", review: "Ответ" };
const WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function ContentPlan() {
  const data = useData();
  const addPost = useAppStore((s) => s.addPost);
  const updatePost = useAppStore((s) => s.updatePost);
  const update = useAppStore((s) => s.update);
  const addActivity = useAppStore((s) => s.addActivity);
  const [filling, setFilling] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 && day <= daysInMonth ? new Date(year, month, day) : null;
  });
  const postsByDay = (d: Date) => data.posts.filter((p) => isSameDay(new Date(p.date), d));
  const monthPosts = data.posts.filter((p) => new Date(p.date).getMonth() === month);
  const open = data.posts.find((p) => p.id === openId);

  const fill = async () => {
    setFilling(true);
    const p = PROFILES[data.type];
    let added = 0;
    for (let day = now.getDate() + 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day, 19, 0);
      if (postsByDay(d).length || (day - now.getDate()) % 2 === 0) continue;
      const tpl = p.posts[(day + added) % p.posts.length];
      const gen = generateContent(data, { type: tpl.type, topic: tpl.title, tone: "friendly" });
      addPost({ date: d.toISOString(), type: tpl.type, title: tpl.title, text: tpl.text + "\n\n" + gen.text.split("\n\n").slice(-1)[0], hashtags: tpl.hashtags, status: "planned", byAgent: true });
      added++;
      await sleep(140);
    }
    setFilling(false);
    addActivity({ kind: "post", text: `Заполнил контент-план до конца месяца: +${added} публикаций`, href: "/marketing?tab=plan" });
    toast.success(added ? `Агент добавил ${added} публикаций` : "План уже заполнен", { description: "Посты будут опубликованы автоматически в 19:00" });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
          <span className="text-base font-semibold capitalize">
            {MONTHS_NOM[month]} {year}
          </span>
          <span className="text-muted-foreground">
            {monthPosts.filter((p) => p.status === "published").length} опубликовано · {monthPosts.filter((p) => p.status === "planned").length} запланировано
          </span>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="hidden gap-2 lg:flex">
            {POST_TYPES.slice(0, 4).map((t) => (
              <span key={t.id} className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", TYPE_STYLE[t.id])}>
                {t.label}
              </span>
            ))}
          </div>
          <Button variant="ai" onClick={fill} disabled={filling} className="flex-1 sm:flex-none">
            <Sparkles className={cn(filling && "animate-spin")} /> {filling ? "Агент планирует…" : "Заполнить план"}
          </Button>
        </div>
      </div>
      {/* Телефон: лента публикаций по дням */}
      <div className="space-y-2 md:hidden">
        {cells
          .filter((d): d is Date => !!d && postsByDay(d).length > 0 && d.getDate() >= now.getDate() - 3)
          .map((d) => {
            const today = isSameDay(d, now);
            return (
              <div key={d.toISOString()} className="flex gap-3">
                <div className={cn("flex w-12 shrink-0 flex-col items-center rounded-xl border py-1.5", today ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                  <span className="text-lg font-semibold leading-none">{d.getDate()}</span>
                  <span className={cn("text-[10px] uppercase", today ? "text-primary-foreground/80" : "text-muted-foreground")}>{WEEK[(d.getDay() + 6) % 7]}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {postsByDay(d).map((p) => (
                    <button key={p.id} onClick={() => setOpenId(p.id)} className="flex w-full items-center gap-2.5 rounded-xl border bg-card p-2.5 text-left shadow-sm transition active:scale-[0.99] animate-fade-in-up">
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", TYPE_STYLE[p.type])}>{TYPE_SHORT[p.type]}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                      {p.status === "published" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : p.byAgent ? <Sparkles className="h-4 w-4 shrink-0 text-ai" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
          {WEEK.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const posts = d ? postsByDay(d) : [];
            const today = d && isSameDay(d, now);
            return (
              <div key={i} className={cn("min-h-[104px] border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0", !d && "bg-muted/20", d && d < now && !today && "bg-muted/10")}>
                {d && (
                  <>
                    <div className={cn("mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs", today ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground")}>{d.getDate()}</div>
                    <div className="space-y-1">
                      {posts.map((p) => (
                        <button key={p.id} onClick={() => setOpenId(p.id)} className={cn("flex w-full items-center gap-1 truncate rounded px-1.5 py-1 text-left text-[11px] font-medium transition hover:opacity-80 animate-fade-in-up", TYPE_STYLE[p.type])}>
                          {p.status === "published" ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : p.byAgent ? <Sparkles className="h-3 w-3 shrink-0" /> : null}
                          <span className="truncate">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-2xl">
          {open && <PlanPostDialog post={open} />}
          {open && (
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  update((d) => {
                    d.posts = d.posts.filter((p) => p.id !== open.id);
                  });
                  setOpenId(null);
                  toast("Публикация удалена из плана");
                }}
              >
                <Trash2 /> Удалить
              </Button>
              {open.status !== "published" && (
                <Button
                  onClick={() => {
                    updatePost(open.id, { status: "published", date: new Date().toISOString(), reach: 0, likes: 0 });
                    addActivity({ kind: "post", text: `Опубликовал «${open.title}» в Instagram`, href: "/marketing?tab=plan" });
                    setOpenId(null);
                    toast.success("Опубликовано в Instagram", { description: open.title });
                  }}
                >
                  Опубликовать сейчас
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanPostDialog({ post }: { post: Post }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {post.title} {post.byAgent && <AiBadge />}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-5 sm:grid-cols-[1fr_260px]">
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant={post.status === "published" ? "success" : "info"}>{post.status === "published" ? "Опубликован" : "Запланирован"}</Badge>
            <Badge variant="secondary">{POST_TYPES.find((t) => t.id === post.type)?.label}</Badge>
            <Badge variant="outline">{formatDate(post.date)}</Badge>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{post.text}</p>
          {post.status === "published" && post.reach !== undefined && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/60 p-2.5">
                <div className="text-xs text-muted-foreground">Охват</div>
                <div className="font-semibold">{formatNumber(post.reach)}</div>
              </div>
              <div className="rounded-lg bg-muted/60 p-2.5">
                <div className="text-xs text-muted-foreground">Лайки</div>
                <div className="font-semibold">{formatNumber(post.likes ?? 0)}</div>
              </div>
            </div>
          )}
        </div>
        <div className="origin-top scale-[0.85]">
          <PostPreview text={post.text} hashtags={post.hashtags} type={post.type} title={post.title} />
        </div>
      </div>
    </>
  );
}
