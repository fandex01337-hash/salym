"use client";

import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import { BUSINESS_ICONS } from "@/components/layout/business-icons";
import type { PostType } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { useData } from "@/store/app-store";

const GRADIENTS = [
  "from-violet-500 via-fuchsia-500 to-orange-400",
  "from-sky-500 via-indigo-500 to-violet-500",
  "from-emerald-400 via-teal-500 to-sky-600",
  "from-amber-400 via-rose-500 to-fuchsia-600",
];

/** Мокап поста Instagram / сторис */
export function PostPreview({ text, hashtags, type, title, streaming }: { text: string; hashtags: string[]; type: PostType; title: string; streaming?: boolean }) {
  const data = useData();
  const Icon = BUSINESS_ICONS[data.type];
  const handle = data.knowledge.instagram.replace("@", "");
  const grad = GRADIENTS[title.length % GRADIENTS.length];

  if (type === "stories") {
    return (
      <div className={cn("relative mx-auto flex aspect-[9/16] w-full max-w-[260px] flex-col overflow-hidden rounded-[28px] bg-gradient-to-br p-4 text-white shadow-xl", grad)}>
        <div className="mb-3 flex gap-1">
          <div className="h-0.5 flex-1 rounded bg-white" />
          <div className="h-0.5 flex-1 rounded bg-white/40" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {handle}
        </div>
        <div className="flex flex-1 items-center">
          <p className={cn("whitespace-pre-wrap text-center text-lg font-bold leading-snug drop-shadow", streaming && "typing-caret")}>{text || "…"}</p>
        </div>
        <div className="rounded-full border border-white/60 py-2 text-center text-xs">Отправить сообщение</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border bg-card shadow-lg">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 p-[2px]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
        </span>
        <div className="flex-1 leading-tight">
          <div className="text-[13px] font-semibold">{handle}</div>
          <div className="text-[11px] text-muted-foreground">Тараз, Казахстан</div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={cn("relative flex aspect-square items-center justify-center bg-gradient-to-br p-8 text-center", grad)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
        <div className="relative">
          <Icon className="mx-auto mb-3 h-10 w-10 text-white/90" />
          <div className="text-2xl font-bold leading-tight text-white drop-shadow-md">{title || "Ваш пост"}</div>
          <div className="mt-2 text-xs font-medium uppercase tracking-widest text-white/80">{data.name.replace(/^.*«|»$/g, "")}</div>
        </div>
      </div>
      <div className="flex items-center gap-3.5 px-3 pt-2.5">
        <Heart className="h-5 w-5" />
        <MessageCircle className="h-5 w-5" />
        <Send className="h-5 w-5" />
        <Bookmark className="ml-auto h-5 w-5" />
      </div>
      <div className="max-h-56 overflow-y-auto px-3 pb-3 pt-2 text-[13px] leading-relaxed scrollbar-thin">
        <span className="font-semibold">{handle} </span>
        <span className={cn("whitespace-pre-wrap", streaming && "typing-caret")}>{text || "Здесь появится текст поста…"}</span>
        {hashtags.length > 0 && <div className="mt-1.5 text-sky-600 dark:text-sky-400">{hashtags.join(" ")}</div>}
      </div>
    </div>
  );
}
