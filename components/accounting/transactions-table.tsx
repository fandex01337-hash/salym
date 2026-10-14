"use client";

import { useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { AiBadge } from "@/components/shared/ai-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate, formatMoney, formatTime } from "@/lib/utils";
import { useData } from "@/store/app-store";

export function TransactionsTable() {
  const data = useData();
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(25);
  const clients = new Map(data.clients.map((c) => [c.id, c.name]));
  const fresh = Date.now() - 15 * 60000;

  const list = data.transactions.filter(
    (t) => (type === "all" || t.type === type) && (!q || t.description.toLowerCase().includes(q.toLowerCase()) || t.category.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Операции</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{data.transactions.length} операций за 60 дней · агент разносит их по категориям автоматически</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" className="h-8 w-full rounded-md sm:w-44 border bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <div className="inline-flex rounded-md bg-muted p-0.5 text-xs">
            {(["all", "income", "expense"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={cn("rounded px-2.5 py-1 font-medium transition", type === t ? "bg-background shadow-sm" : "text-muted-foreground")}>
                {t === "all" ? "Все" : t === "income" ? "Доходы" : "Расходы"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => toast.success("Выгрузка подготовлена", { description: "Файл для 1С и бухгалтера сформирован (демо)" })}>
            <Download /> Экспорт
          </Button>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="hidden px-5 py-2 font-medium sm:table-cell">Дата</th>
              <th className="px-4 py-2 font-medium sm:px-3">Описание</th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">Категория</th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">Клиент</th>
              <th className="px-4 py-2 text-right font-medium sm:px-5">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, limit).map((t) => {
              const isNew = new Date(t.date).getTime() > fresh && !!t.dealId;
              return (
                <tr key={t.id} className={cn("border-b last:border-0 hover:bg-muted/30", isNew && "bg-emerald-500/[0.06] animate-fade-in-up")}>
                  <td className="hidden whitespace-nowrap px-5 py-2 text-xs text-muted-foreground sm:table-cell">
                    {formatDate(t.date)}, {formatTime(t.date)}
                  </td>
                  <td className="px-4 py-2 sm:px-3">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="min-w-0">{t.description}</span>
                      {isNew && <AiBadge label="новое" />}
                    </span>
                    <span className="block text-[11px] text-muted-foreground md:hidden">
                      <span className="sm:hidden">{formatDate(t.date)}, {formatTime(t.date)} · </span>
                      {t.category}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    <Badge variant={t.type === "income" ? "success" : "secondary"}>{t.category}</Badge>
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-muted-foreground lg:table-cell">{t.clientId ? clients.get(t.clientId) : "—"}</td>
                  <td className={cn("whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums sm:px-5", t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "")}>
                    {t.type === "income" ? "+" : "−"}
                    {formatMoney(t.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {list.length > limit && (
        <div className="border-t p-3 text-center">
          <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + 50)}>
            Показать ещё ({list.length - limit})
          </Button>
        </div>
      )}
    </Card>
  );
}
