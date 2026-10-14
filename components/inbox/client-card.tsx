"use client";

import { Flame, Phone, Plus, Snowflake, Sun } from "lucide-react";
import { toast } from "sonner";
import { ChannelIcon, CHANNEL_META } from "@/components/shared/channel-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import type { Temperature } from "@/lib/data/types";
import { cn, formatDate, formatMoney, plural } from "@/lib/utils";
import { STAGE_LABELS, useAppStore, useData } from "@/store/app-store";

export const TEMP_META: Record<Temperature, { label: string; icon: typeof Flame; cls: string }> = {
  hot: { label: "Горячий лид", icon: Flame, cls: "bg-red-500/10 text-red-600 dark:text-red-400" },
  warm: { label: "Тёплый лид", icon: Sun, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  cold: { label: "Холодный лид", icon: Snowflake, cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
};

export function ClientCard({ clientId }: { clientId: string }) {
  const data = useData();
  const addDeal = useAppStore((s) => s.addDeal);
  const client = data.clients.find((c) => c.id === clientId);
  if (!client) return null;
  const T = TEMP_META[client.temperature];
  const deals = data.deals.filter((d) => d.clientId === clientId);
  const history = data.transactions.filter((t) => t.clientId === clientId && t.type === "income").slice(0, 5);
  const openSum = deals.filter((d) => !["paid", "lost"].includes(d.stage)).reduce((s, d) => s + d.amount, 0);

  const createDeal = () => {
    const svc = data.services[0];
    addDeal({ clientId, title: svc.name, serviceId: svc.id, amount: svc.price, stage: "new", movedByAgent: false });
    toast.success("Сделка создана", { description: `${client.name} · ${svc.name}` });
  };

  return (
    <div className="flex min-h-0 flex-col overflow-y-auto scrollbar-thin">
      <div className="flex flex-col items-center border-b px-4 py-5 text-center">
        <Avatar name={client.name} size={56} />
        <div className="mt-2 font-semibold">{client.name}</div>
        <div className="text-xs text-muted-foreground">{client.phone}</div>
        <div className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", T.cls)}>
          <T.icon className="h-3 w-3" /> {T.label}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => toast("Звонок через ИИ-оператора", { description: `Агент позвонит ${client.name} и сообщит результат` })}>
            <Phone /> Позвонить
          </Button>
          <Button size="sm" variant="outline" onClick={createDeal}>
            <Plus /> Сделка
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b p-4 text-center">
        <div>
          <div className="text-sm font-semibold tabular-nums">{formatMoney(client.totalSpent)}</div>
          <div className="text-[11px] text-muted-foreground">потратил</div>
        </div>
        <div>
          <div className="text-sm font-semibold tabular-nums">{client.visits}</div>
          <div className="text-[11px] text-muted-foreground">{plural(client.visits, ["визит", "визита", "визитов"])}</div>
        </div>
        <div>
          <div className="text-sm font-semibold tabular-nums">{formatMoney(openSum)}</div>
          <div className="text-[11px] text-muted-foreground">в работе</div>
        </div>
      </div>

      <div className="space-y-4 p-4 text-sm">
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Источник</div>
          <div className="flex items-center gap-2">
            <ChannelIcon id={client.channel} size={16} /> {CHANNEL_META[client.channel].label}
            <span className="text-xs text-muted-foreground">· с {formatDate(client.createdAt)}</span>
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Теги</div>
          <div className="flex flex-wrap gap-1">
            {client.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        {deals.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Сделки</div>
            <div className="space-y-1.5">
              {deals.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                  <span className="truncate">{d.title}</span>
                  <Badge variant={d.stage === "paid" ? "success" : d.stage === "lost" ? "danger" : "default"}>{STAGE_LABELS[d.stage]}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">История покупок</div>
          {history.length ? (
            <div className="space-y-1">
              {history.map((t) => (
                <div key={t.id} className="flex justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">
                    {formatDate(t.date)} · {t.description}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatMoney(t.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Новый клиент — покупок ещё не было</p>
          )}
        </div>
        {client.note && (
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Заметка агента</div>
            <p className="text-xs">{client.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}
