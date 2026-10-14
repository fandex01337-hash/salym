"use client";

import { useEffect, useState } from "react";
import { FilePlus2, FileText, Printer, Send } from "lucide-react";
import { toast } from "sonner";
import { AiBadge } from "@/components/shared/ai-bits";
import { EmptyState } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BizDocument } from "@/lib/data/types";
import { cn, formatDate, formatMoney, uid } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";
import { DOC_KIND_LABEL, DocumentView } from "./document-view";

const SHORT: Record<BizDocument["kind"], string> = { invoice: "Счёт", act: "Акт", waybill: "Накладная" };
const STATUS: Record<BizDocument["status"], { label: string; variant: "success" | "info" | "secondary" }> = {
  paid: { label: "Оплачен", variant: "success" },
  sent: { label: "Отправлен", variant: "info" },
  draft: { label: "Черновик", variant: "secondary" },
};

function CreateDocDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void }) {
  const data = useData();
  const update = useAppStore((s) => s.update);
  const addActivity = useAppStore((s) => s.addActivity);
  const [kind, setKind] = useState<BizDocument["kind"]>("invoice");
  const [clientId, setClientId] = useState(data.clients[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(data.services[0]?.id ?? "");
  const [qty, setQty] = useState(1);

  const create = () => {
    const svc = data.services.find((s) => s.id === serviceId)!;
    const client = data.clients.find((c) => c.id === clientId)!;
    const key = kind;
    const prefix = { invoice: "СЧ", act: "АВР", waybill: "НК" }[kind];
    const num = data.counters[key] + 1;
    const doc: BizDocument = {
      id: uid("doc"),
      kind,
      number: `${prefix}-${String(num).padStart(4, "0")}`,
      date: new Date().toISOString(),
      counterparty: client.name,
      items: [{ name: svc.name, qty, price: svc.price }],
      total: svc.price * qty,
      status: "sent",
      byAgent: true,
    };
    update((d) => {
      d.documents = [doc, ...d.documents];
      d.counters = { ...d.counters, [key]: num };
    });
    addActivity({ kind: "invoice", text: `Сформировал ${SHORT[kind].toLowerCase()} ${doc.number} для ${client.name}`, href: `/accounting?tab=documents&doc=${doc.id}` });
    toast.success(`${SHORT[kind]} ${doc.number} создан`, { description: `${client.name} · ${formatMoney(doc.total)}` });
    onOpenChange(false);
    onCreated(doc.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый документ</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Тип документа</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as BizDocument["kind"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">Счёт на оплату</SelectItem>
                <SelectItem value="act">Акт выполненных работ</SelectItem>
                <SelectItem value="waybill">Накладная</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Клиент</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.clients.slice(0, 30).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_90px] gap-3">
            <div className="grid gap-1.5">
              <Label>Услуга / товар</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {formatMoney(s.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Кол-во</Label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button variant="ai" onClick={create}>
            Сформировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Documents({ initialDocId }: { initialDocId?: string | null }) {
  const data = useData();
  const [filter, setFilter] = useState<BizDocument["kind"] | "all">("all");
  const [openId, setOpenId] = useState<string | null>(initialDocId ?? null);
  const [creating, setCreating] = useState(false);
  const fresh = Date.now() - 15 * 60000;

  useEffect(() => {
    if (initialDocId) setOpenId(initialDocId);
  }, [initialDocId]);

  const docs = data.documents.filter((d) => filter === "all" || d.kind === filter);
  const open = data.documents.find((d) => d.id === openId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          {(["all", "invoice", "act", "waybill"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-xs transition", filter === f ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
            >
              {f === "all" ? `Все (${data.documents.length})` : { invoice: "Счета", act: "Акты", waybill: "Накладные" }[f]}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
          <FilePlus2 /> Создать документ
        </Button>
      </div>
      <Card className="overflow-hidden">
        {docs.length === 0 && <EmptyState icon={<FileText className="h-5 w-5" />} title="Документов этого типа пока нет" text="Агент создаст их автоматически при оплате или по вашей команде" />}
        <table className={cn("w-full text-sm", docs.length === 0 && "hidden")}>
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium sm:px-5">Документ</th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">Контрагент</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Дата</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Статус</th>
              <th className="px-4 py-2 text-right font-medium sm:px-5">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const isNew = new Date(d.date).getTime() > fresh;
              return (
                <tr key={d.id} onClick={() => setOpenId(d.id)} className={cn("cursor-pointer border-b last:border-0 hover:bg-muted/40", isNew && "bg-emerald-500/[0.06] animate-fade-in-up")}>
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          {d.number} {d.byAgent && <AiBadge />} {isNew && <Badge variant="success">новый</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="hidden md:inline">{DOC_KIND_LABEL[d.kind]}</span>
                          <span className="md:hidden">
                            {d.counterparty} · {formatDate(d.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell">{d.counterparty}</td>
                  <td className="hidden px-3 py-2.5 text-xs text-muted-foreground sm:table-cell">{formatDate(d.date)}</td>
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    <Badge variant={STATUS[d.status].variant}>{STATUS[d.status].label}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums sm:px-5">{formatMoney(d.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-3xl bg-secondary">
          <DialogHeader>
            <DialogTitle>
              {open && SHORT[open.kind]} {open?.number}
            </DialogTitle>
          </DialogHeader>
          {open && <DocumentView doc={open} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => toast.success("Документ отправлен клиенту", { description: `${open?.counterparty} получит его в WhatsApp` })}>
              <Send /> Отправить клиенту
            </Button>
            <Button onClick={() => window.print()}>
              <Printer /> Скачать PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CreateDocDialog open={creating} onOpenChange={setCreating} onCreated={setOpenId} />
    </div>
  );
}
