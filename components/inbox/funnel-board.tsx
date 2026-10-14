"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/misc";
import type { Deal, DealStage } from "@/lib/data/types";
import { cn, formatMoney, formatRelative } from "@/lib/utils";
import { STAGE_LABELS, useAppStore, useData } from "@/store/app-store";
import { useLiveStore } from "@/store/live-store";

const STAGES: { id: DealStage; dot: string }[] = [
  { id: "new", dot: "bg-sky-500" },
  { id: "in_progress", dot: "bg-violet-500" },
  { id: "awaiting_payment", dot: "bg-amber-500" },
  { id: "paid", dot: "bg-emerald-500" },
  { id: "lost", dot: "bg-zinc-400" },
];

interface DragState {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  offX: number;
  offY: number;
  width: number;
  active: boolean;
}

function DealCardBody({ deal, name }: { deal: Deal; name: string }) {
  return (
    <>
      <div className="flex items-start gap-2 pr-5">
        <Avatar name={name} size={24} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{name}</div>
          <div className="truncate text-xs text-muted-foreground">{deal.title}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold tabular-nums">{formatMoney(deal.amount)}</span>
        <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
          {deal.movedByAgent && <Sparkles className="h-3 w-3 text-ai" />}
          {formatRelative(deal.updatedAt)}
        </span>
      </div>
    </>
  );
}

export function FunnelBoard() {
  const data = useData();
  const moveDeal = useAppStore((s) => s.moveDeal);
  const highlight = useLiveStore((s) => s.highlightDealId);
  const router = useRouter();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [over, setOver] = useState<DealStage | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const clients = new Map(data.clients.map((c) => [c.id, c]));

  // Пока карточку тащат пальцем — блокируем прокрутку страницы
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (dragRef.current?.active) e.preventDefault();
    };
    window.addEventListener("touchmove", block, { passive: false });
    return () => window.removeEventListener("touchmove", block);
  }, []);

  const move = (dealId: string, stage: DealStage) => {
    const deal = useAppStore.getState().data?.deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === stage) return;
    const res = moveDeal(deal.id, stage);
    const name = clients.get(deal.clientId)?.name ?? "";
    if (stage === "paid" && res && res.invoice) {
      const inv = res.invoice;
      toast.success(`Агент выставил счёт № ${inv.number}`, {
        description: `${name} · ${formatMoney(inv.total)} — доход уже в бухгалтерии`,
        duration: 8000,
        action: { label: "Открыть", onClick: () => router.push(`/accounting?tab=documents&doc=${inv.id}`) },
      });
    } else if (stage === "awaiting_payment") {
      toast("Агент отправил ссылку на оплату Kaspi", { description: `${name} · ${formatMoney(deal.amount)}` });
    } else if (stage === "lost") {
      toast("Сделка закрыта как отказ", { description: `Агент напомнит ${name} о себе через 14 дней` });
    } else {
      toast(`Сделка → «${STAGE_LABELS[stage]}»`, { description: name });
    }
  };

  const stageAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest("[data-stage]");
    return (el?.getAttribute("data-stage") as DealStage | null) ?? null;
  };

  /**
   * Перетаскивание на pointer-событиях.
   * Мышь — сразу после сдвига на 5px. Палец — после долгого нажатия (300 мс),
   * чтобы обычный свайп продолжал листать воронку.
   */
  const startDrag = (e: React.PointerEvent<HTMLDivElement>, dealId: string) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("[data-no-drag]")) return;
    const touch = e.pointerType === "touch";
    if (!touch) e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { id: dealId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, offX: e.clientX - rect.left, offY: e.clientY - rect.top, width: rect.width, active: false };

    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    if (touch) {
      pressTimer = setTimeout(() => {
        const d = dragRef.current;
        if (!d) return;
        dragRef.current = { ...d, active: true };
        setDrag(dragRef.current);
        setOver(stageAt(d.x, d.y));
        navigator.vibrate?.(15);
      }, 300);
    }

    const onMove = (ev: PointerEvent | MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dist = Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY);
      if (touch && !d.active) {
        // Палец сдвинулся до долгого нажатия — это прокрутка, а не перетаскивание
        if (dist > 8) cancel();
        return;
      }
      const active = d.active || dist > 5;
      const next = { ...d, x: ev.clientX, y: ev.clientY, active };
      dragRef.current = next;
      if (active) {
        setDrag(next);
        setOver(stageAt(ev.clientX, ev.clientY));
      }
    };
    const cleanup = () => {
      if (pressTimer) clearTimeout(pressTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("pointercancel", cancel);
    };
    const onUp = (ev: PointerEvent | MouseEvent) => {
      const d = dragRef.current;
      cleanup();
      dragRef.current = null;
      setDrag(null);
      setOver(null);
      if (d?.active) {
        const stage = stageAt(ev.clientX, ev.clientY);
        if (stage) move(d.id, stage);
      }
    };
    function cancel() {
      cleanup();
      dragRef.current = null;
      setDrag(null);
      setOver(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("pointercancel", cancel);
  };

  const dragged = drag?.active ? data.deals.find((d) => d.id === drag.id) : null;

  return (
    <>
      <div
        className={cn(
          "-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 scrollbar-thin sm:mx-0 sm:px-0 lg:grid lg:snap-none lg:grid-cols-5 lg:overflow-visible",
          "select-none",
          drag?.active && "cursor-grabbing",
        )}
      >
        {STAGES.map((s) => {
          const deals = data.deals.filter((d) => d.stage === s.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          const total = deals.reduce((sum, d) => sum + d.amount, 0);
          return (
            <div
              key={s.id}
              data-stage={s.id}
              className={cn(
                "flex w-[78vw] max-w-[300px] shrink-0 snap-center flex-col rounded-xl border bg-muted/40 transition sm:w-[260px] lg:w-auto lg:max-w-none",
                over === s.id && "border-primary/50 bg-primary/5 ring-2 ring-primary/20",
              )}
            >
              <div className="flex items-center gap-2 px-3 pb-1 pt-3 text-[13px] font-semibold">
                <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                {STAGE_LABELS[s.id]}
                <span className="rounded bg-background px-1.5 text-[11px] font-medium text-muted-foreground">{deals.length}</span>
              </div>
              <div className="px-3 pb-2 text-[11px] text-muted-foreground tabular-nums">{formatMoney(total)}</div>
              <div className="max-h-[60dvh] flex-1 space-y-2 overflow-y-auto px-2 pb-2 scrollbar-thin lg:max-h-[620px]">
                {deals.map((d) => {
                  const name = clients.get(d.clientId)?.name ?? "?";
                  return (
                    <div
                      key={d.id}
                      onPointerDown={(e) => startDrag(e, d.id)}
                      onContextMenu={(e) => e.preventDefault()}
                      className={cn(
                        "group relative cursor-grab rounded-lg border bg-card p-2.5 shadow-sm transition hover:shadow-md [-webkit-touch-callout:none]",
                        drag?.active && drag.id === d.id && "scale-95 opacity-30",
                        highlight === d.id && "animate-highlight border-ai/50",
                      )}
                    >
                      <DealCardBody deal={d} name={name} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            data-no-drag
                            className="absolute right-1 top-1 rounded-md p-1 text-muted-foreground/70 transition hover:bg-muted hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100 lg:data-[state=open]:opacity-100"
                            aria-label="Переместить сделку"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Переместить в…</DropdownMenuLabel>
                          {STAGES.filter((x) => x.id !== d.stage).map((x) => (
                            <DropdownMenuItem key={x.id} onClick={() => move(d.id, x.id)}>
                              <span className={cn("h-2 w-2 rounded-full", x.dot)} /> {STAGE_LABELS[x.id]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
                {!deals.length && <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Перетащите сделку сюда</div>}
              </div>
            </div>
          );
        })}
      </div>
      {dragged &&
        drag &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[60] rotate-2 rounded-lg border bg-card p-2.5 shadow-2xl ring-2 ring-primary/30"
            style={{ left: drag.x - drag.offX, top: drag.y - drag.offY, width: drag.width }}
          >
            <DealCardBody deal={dragged} name={clients.get(dragged.clientId)?.name ?? "?"} />
          </div>,
          document.body,
        )}
    </>
  );
}
