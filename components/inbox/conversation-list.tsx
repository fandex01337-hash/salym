"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ChannelIcon, CHANNEL_META } from "@/components/shared/channel-icon";
import { TypingDots } from "@/components/shared/ai-bits";
import { Avatar } from "@/components/ui/misc";
import type { Channel } from "@/lib/data/types";
import { cn, formatRelative } from "@/lib/utils";
import { useData } from "@/store/app-store";
import { useLiveStore } from "@/store/live-store";

const FILTERS: (Channel | "all")[] = ["all", "instagram", "whatsapp", "telegram", "website", "2gis"];

export function ConversationList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const data = useData();
  const typing = useLiveStore((s) => s.typing);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Channel | "all">("all");

  const clients = useMemo(() => new Map(data.clients.map((c) => [c.id, c])), [data.clients]);
  const list = data.conversations.filter((c) => {
    if (filter !== "all" && c.channel !== filter) return false;
    if (!query) return true;
    const cl = clients.get(c.clientId);
    const q = query.toLowerCase();
    return cl?.name.toLowerCase().includes(q) || c.messages.some((m) => m.text.toLowerCase().includes(q));
  });

  return (
    <div className="flex min-h-0 flex-col">
      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по клиентам и сообщениям"
            className="h-9 w-full rounded-md border bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              title={f === "all" ? "Все каналы" : CHANNEL_META[f].label}
              className={cn("flex h-7 items-center justify-center rounded-md px-2 text-xs transition", filter === f ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:bg-muted")}
            >
              {f === "all" ? "Все" : <ChannelIcon id={f} size={16} />}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {list.map((c) => {
          const cl = clients.get(c.clientId);
          const last = c.messages[c.messages.length - 1];
          const isTyping = typing[c.id] !== undefined && typing[c.id] !== null;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex w-full gap-3 border-b px-3 py-3 text-left transition animate-fade-in-up",
                selectedId === c.id ? "bg-primary/[0.06]" : "hover:bg-muted/50",
              )}
            >
              <div className="relative">
                <Avatar name={cl?.name ?? "?"} size={38} />
                <ChannelIcon id={c.channel} size={16} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-card" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-[13.5px]", c.unread ? "font-semibold" : "font-medium")}>{cl?.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(c.updatedAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {isTyping ? (
                    <span className="flex items-center gap-1.5 text-xs text-ai">
                      <TypingDots /> агент печатает
                    </span>
                  ) : (
                    <span className="line-clamp-1 flex-1 text-xs text-muted-foreground">
                      {last.from === "agent" && <span className="font-medium text-ai">ИИ: </span>}
                      {last.from === "manager" && <span className="font-medium text-foreground/70">Вы: </span>}
                      {last.text}
                    </span>
                  )}
                  {c.unread > 0 && <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{c.unread}</span>}
                  {c.mode === "manual" && !c.unread && <span className="ml-auto rounded bg-amber-500/15 px-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">вручную</span>}
                </div>
              </div>
            </button>
          );
        })}
        {!list.length && <p className="p-6 text-center text-sm text-muted-foreground">Ничего не найдено</p>}
      </div>
    </div>
  );
}
