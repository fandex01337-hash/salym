"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, CalendarRange, Download, FileSpreadsheet, History, Landmark, ListOrdered, Loader2, Mail, Package, Percent, Receipt, Users, Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AiBadge } from "@/components/shared/ai-bits";
import { CountUp } from "@/components/shared/count-up";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { downloadExcelReport } from "@/lib/reports/excel";
import { REPORT_PERIODS, buildReport, type ReportPeriod } from "@/lib/reports/report-data";
import { cn, formatCompactMoney, formatMoney, formatTime } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";

interface Sheet {
  icon: LucideIcon;
  name: string;
  desc: string;
  rows: number;
}

const delta = (cur: number, prev: number | undefined) => (prev ? Math.round((cur / prev - 1) * 100) : undefined);

export default function ReportsPage() {
  const data = useData();
  const addActivity = useAppStore((s) => s.addActivity);
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ at: Date; name: string; size: number; period: string }[]>([]);
  const [auto, setAuto] = useState({ weekly: true, monthly: true });
  const report = useMemo(() => buildReport(data, period), [data, period]);
  const t = report.totals;
  const p = report.prevTotals;
  const periodLabel = REPORT_PERIODS.find((x) => x.id === period)?.label ?? "";

  const sheets: Sheet[] = [
    { icon: Wallet, name: "Сводка", desc: "Доход, расход, прибыль, маржа, средний чек и помесячная таблица", rows: 7 + report.months.length },
    { icon: CalendarRange, name: "По дням", desc: "Доходы, расходы и прибыль за каждый день периода", rows: report.days.length },
    { icon: Package, name: "Услуги", desc: "Продажи, выручка, средний чек и доля каждой услуги", rows: report.services.length },
    { icon: Receipt, name: "Расходы", desc: "Категории расходов и сравнение с прошлым периодом", rows: report.expenses.length },
    { icon: Users, name: "Сотрудники", desc: "Выручка, продажи, конверсия и рейтинг каждого", rows: report.team.length },
    { icon: ListOrdered, name: "Операции", desc: "Все доходы и расходы с фильтрами по колонкам", rows: report.operations.length },
    { icon: Receipt, name: "Документы", desc: "Счета, акты и накладные за период", rows: report.documents.length },
    { icon: Landmark, name: "Налоги", desc: "Прогноз по форме 910 и календарь платежей", rows: 5 + report.tax.deadlines.length },
  ];

  const download = async () => {
    setBusy(true);
    try {
      const res = await downloadExcelReport(data, period);
      setHistory((h) => [{ at: new Date(), name: res.fileName, size: res.size, period: periodLabel }, ...h].slice(0, 6));
      addActivity({ kind: "invoice", text: `Сформировал Excel-отчёт о заработке (${periodLabel.toLowerCase()})`, href: "/reports" });
      toast.success("Excel-отчёт скачан", { description: `${res.fileName} · ${Math.max(1, Math.round(res.size / 1024))} КБ` });
    } catch (e) {
      console.error(e);
      toast.error("Не удалось сформировать отчёт", { description: "Попробуйте ещё раз" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Отчёты"
        description="Агент собирает отчёт о заработке из бухгалтерии, продаж и команды — Excel за пару секунд."
        icon={<FileSpreadsheet className="h-4 w-4" />}
        actions={
          <Button variant="ai" onClick={download} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />} Скачать Excel
          </Button>
        }
      />

      <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 sm:inline-flex">
        {REPORT_PERIODS.map((x) => (
          <button
            key={x.id}
            onClick={() => setPeriod(x.id)}
            className={cn("shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition", period === x.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {x.label}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        {report.meta.fromText} — {report.meta.toText}
        {p ? " · сравнение с предыдущим периодом такой же длины" : ""}
      </p>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <KpiCard label="Доход" value={<CountUp value={t.income} format={formatCompactMoney} />} icon={<ArrowUpRight />} delta={delta(t.income, p?.income)} hint={p ? "к прошлому периоду" : `${t.sales} продаж`} />
        <KpiCard label="Расход" value={<CountUp value={t.expense} format={formatCompactMoney} />} icon={<ArrowDownRight />} delta={delta(t.expense, p?.expense)} hint={p ? "к прошлому периоду" : undefined} />
        <KpiCard label="Чистая прибыль" value={<CountUp value={t.profit} format={formatCompactMoney} />} icon={<Wallet />} delta={delta(t.profit, p?.profit)} hint={p ? "к прошлому периоду" : undefined} accent />
        <KpiCard label="Маржинальность" value={<CountUp value={t.margin * 100} format={(v) => `${Math.round(v)}%`} />} icon={<Percent />} hint={`средний чек ${formatMoney(t.avgCheck)}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <FileSpreadsheet className="h-6 w-6" />
              </span>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Отчёт о заработке.xlsx <AiBadge />
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sheets.length} листов · период: {periodLabel.toLowerCase()} · формулы пересчитываются в Excel
                </p>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => toast.success("Отчёт отправлен бухгалтеру", { description: "Excel-файл ушёл на e-mail и в WhatsApp (демо)" })}>
                <Mail /> Бухгалтеру
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={download} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Download />} Скачать
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {sheets.map((s, i) => (
              <div key={s.name} className="flex items-start gap-3 rounded-lg border bg-background p-3 animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <s.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{s.name}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{s.rows} строк</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>По месяцам</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.months.map((mo) => (
                <div key={mo.label} className="rounded-lg bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between font-medium capitalize">
                    {mo.label}
                    <span className={cn("tabular-nums", mo.income - mo.expense >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600")}>{formatMoney(mo.income - mo.expense)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>доход {formatCompactMoney(mo.income)}</span>
                    <span>расход {formatCompactMoney(mo.expense)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Автоотчёты от агента</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(
                [
                  ["weekly", "Каждый понедельник — итоги недели в Telegram"],
                  ["monthly", "1 числа — Excel за месяц на e-mail"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <span>{label}</span>
                  <Switch
                    checked={auto[key]}
                    onCheckedChange={(v) => {
                      setAuto((a) => ({ ...a, [key]: v }));
                      toast(v ? "Автоотчёт включён" : "Автоотчёт выключен", { description: label });
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" /> Последние выгрузки
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <EmptyState icon={<FileSpreadsheet className="h-5 w-5" />} title="Ещё не скачивали" text="Нажмите «Скачать Excel» — файл сохранится на это устройство" />
              ) : (
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm animate-fade-in-up">
                      <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{h.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {h.period} · {Math.max(1, Math.round(h.size / 1024))} КБ · {formatTime(h.at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
