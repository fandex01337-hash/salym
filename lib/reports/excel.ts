"use client";

import type { Borders, CellValue, Worksheet } from "exceljs";
import type { BusinessData } from "../data/types";
import { buildReport, type Report, type ReportPeriod } from "./report-data";

/**
 * Excel-отчёт о заработке. Собирается в браузере (ExcelJS грузится только по нажатию кнопки),
 * поэтому работает и без сервера. Итоги, доли и прибыль — формулами Excel с готовыми значениями.
 */

const MONEY = '#,##0 "₸";[Red]-#,##0 "₸"';
const PCT = "0.0%";
const DELTA = '+0.0%;[Red]-0.0%;0.0%';
const DATE = "dd.mm.yyyy";
const DATETIME = "dd.mm.yyyy hh:mm";
const BRAND = "FF6D28D9";
const BRAND_SOFT = "FFF3F0FF";
const LINE = "FFDCD8F0";

const thin = { style: "thin" as const, color: { argb: LINE } };
const BORDERS: Partial<Borders> = { top: thin, bottom: thin, left: thin, right: thin };

interface Col {
  header: string;
  width: number;
  fmt?: string;
  align?: "left" | "right" | "center";
}

/** Таблица: шапка, строки, (необязательная) строка итогов. Возвращает номера первой и последней строк данных. */
function table(ws: Worksheet, startRow: number, cols: Col[], rows: CellValue[][], totals?: CellValue[]) {
  cols.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (!col.width || col.width < c.width) col.width = c.width;
  });
  const head = ws.getRow(startRow);
  cols.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle", horizontal: c.align ?? (c.fmt ? "right" : "left"), wrapText: true };
    cell.border = BORDERS;
  });
  head.height = 22;
  rows.forEach((r, ri) => {
    const row = ws.getRow(startRow + 1 + ri);
    r.forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v;
      const c = cols[ci];
      if (c?.fmt) cell.numFmt = c.fmt;
      cell.alignment = { vertical: "middle", horizontal: c?.align ?? (c?.fmt ? "right" : "left") };
      cell.border = BORDERS;
      if (ri % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF9FF" } };
    });
  });
  const first = startRow + 1;
  const last = startRow + rows.length;
  if (totals) {
    const row = ws.getRow(last + 1);
    totals.forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v;
      const c = cols[ci];
      if (c?.fmt) cell.numFmt = c.fmt;
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_SOFT } };
      cell.alignment = { horizontal: c?.align ?? (c?.fmt ? "right" : "left") };
      cell.border = { ...BORDERS, top: { style: "medium", color: { argb: BRAND } } };
    });
  }
  return { first, last };
}

const f = (formula: string, result: number | string) => ({ formula, result }) as CellValue;

/** ExcelJS пишет даты в UTC — переносим местное время «как есть», чтобы в Excel не было сдвига на часовой пояс */
const xd = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()));
const ratio = (a: number, b: number) => (b ? a / b : 0);

function title(ws: Worksheet, text: string, sub: string) {
  ws.getCell("A1").value = text;
  ws.getCell("A1").font = { bold: true, size: 15, color: { argb: BRAND } };
  ws.getCell("A2").value = sub;
  ws.getCell("A2").font = { size: 10, color: { argb: "FF6B6880" } };
}

export async function buildWorkbook(report: Report): Promise<ArrayBuffer> {
  const mod = await import("exceljs");
  const ExcelJS = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Салым — ИИ-сотрудник";
  wb.created = xd(report.meta.generatedAt);
  wb.title = `Отчёт о заработке — ${report.meta.business}`;
  // Excel пересчитает формулы при открытии
  wb.calcProperties.fullCalcOnLoad = true;

  const m = report.meta;
  const t = report.totals;
  const p = report.prevTotals;
  const periodText = `Период: ${m.periodLabel} (${m.fromText} — ${m.toText})`;

  // ---------------------------------------------------------------- Сводка
  const s = wb.addWorksheet("Сводка", { views: [{ showGridLines: false }] });
  s.getCell("A1").value = "Отчёт о заработке";
  s.getCell("A1").font = { bold: true, size: 18, color: { argb: BRAND } };
  s.getCell("A2").value = `${m.business} · ${m.typeLabel} · г. ${m.city} · владелец: ${m.owner}`;
  s.getCell("A3").value = periodText;
  s.getCell("A4").value = `Сформирован ${m.generatedAt.toLocaleString("ru-RU")} ИИ-сотрудником «Салым»`;
  for (const a of ["A2", "A3", "A4"]) s.getCell(a).font = { size: 10, color: { argb: "FF6B6880" } };

  const kpiRows: [string, CellValue, number | null, string][] = [
    ["Доход", t.income, p?.income ?? null, MONEY],
    ["Расход", t.expense, p?.expense ?? null, MONEY],
    ["Чистая прибыль", f("B7-B8", t.profit), p?.profit ?? null, MONEY],
    ["Маржинальность", f("IF(B7=0,0,B9/B7)", t.margin), p?.margin ?? null, PCT],
    ["Количество продаж", t.sales, p?.sales ?? null, "#,##0"],
    ["Средний чек", f("IF(B11=0,0,B7/B11)", t.avgCheck), p?.avgCheck ?? null, MONEY],
    ["Новых клиентов", t.newClients, null, "#,##0"],
  ];
  table(
    s,
    6,
    [
      { header: "Показатель", width: 28 },
      { header: "За период", width: 18, fmt: MONEY },
      { header: "Прошлый период", width: 18, fmt: MONEY },
      { header: "Изменение", width: 14, fmt: DELTA },
    ],
    kpiRows.map(([name, val, prev], i) => {
      const r = 7 + i;
      const cur = typeof val === "object" && val && "result" in (val as object) ? Number((val as { result: number }).result) : Number(val);
      return [name, val, prev, prev === null ? "" : f(`IF(OR(C${r}="",C${r}=0),"",B${r}/C${r}-1)`, prev ? cur / prev - 1 : "")];
    }),
  );
  kpiRows.forEach(([, , , fmt], i) => {
    s.getCell(`B${7 + i}`).numFmt = fmt;
    s.getCell(`C${7 + i}`).numFmt = fmt;
  });
  s.getCell("B9").font = { bold: true, color: { argb: t.profit >= 0 ? "FF15803D" : "FFB91C1C" } };

  const mStart = 16;
  s.getCell(`A${mStart - 1}`).value = "По месяцам";
  s.getCell(`A${mStart - 1}`).font = { bold: true, size: 12, color: { argb: BRAND } };
  const monthRows = report.months.map((mo, i) => {
    const r = mStart + 1 + i;
    return [mo.label, mo.income, mo.expense, f(`B${r}-C${r}`, mo.income - mo.expense), f(`IF(B${r}=0,0,D${r}/B${r})`, ratio(mo.income - mo.expense, mo.income))];
  });
  const mt = table(
    s,
    mStart,
    [
      { header: "Месяц", width: 28 },
      { header: "Доход", width: 18, fmt: MONEY },
      { header: "Расход", width: 18, fmt: MONEY },
      { header: "Прибыль", width: 14, fmt: MONEY },
      { header: "Маржа", width: 12, fmt: PCT },
    ],
    monthRows,
    [
      "Итого",
      f(`SUM(B${mStart + 1}:B${mStart + monthRows.length})`, t.income),
      f(`SUM(C${mStart + 1}:C${mStart + monthRows.length})`, t.expense),
      f(`SUM(D${mStart + 1}:D${mStart + monthRows.length})`, t.profit),
      f(`IF(B${mStart + monthRows.length + 1}=0,0,D${mStart + monthRows.length + 1}/B${mStart + monthRows.length + 1})`, t.margin),
    ],
  );
  s.getCell(`A${mt.last + 3}`).value = "Листы: По дням · Услуги · Расходы · Сотрудники · Операции · Документы · Налоги";
  s.getCell(`A${mt.last + 3}`).font = { italic: true, size: 9, color: { argb: "FF8A87A0" } };
  s.getCell(`A${mt.last + 4}`).value = "Демо-данные приложения «Салым». Налоговый прогноз — оценка, сверяйте с кабинетом налогоплательщика.";
  s.getCell(`A${mt.last + 4}`).font = { italic: true, size: 9, color: { argb: "FF8A87A0" } };

  // ---------------------------------------------------------------- По дням
  const d = wb.addWorksheet("По дням", { views: [{ state: "frozen", ySplit: 3 }] });
  title(d, "Доходы и расходы по дням", periodText);
  const dayRows = report.days.map((row, i) => {
    const r = 4 + i;
    return [xd(row.date), row.income, row.expense, f(`B${r}-C${r}`, row.income - row.expense), row.sales];
  });
  const dLast = 3 + dayRows.length;
  table(
    d,
    3,
    [
      { header: "Дата", width: 14, fmt: DATE, align: "left" },
      { header: "Доход", width: 16, fmt: MONEY },
      { header: "Расход", width: 16, fmt: MONEY },
      { header: "Прибыль", width: 16, fmt: MONEY },
      { header: "Продаж", width: 10, fmt: "#,##0" },
    ],
    dayRows,
    ["Итого", f(`SUM(B4:B${dLast})`, t.income), f(`SUM(C4:C${dLast})`, t.expense), f(`SUM(D4:D${dLast})`, t.profit), f(`SUM(E4:E${dLast})`, t.sales)],
  );

  // ---------------------------------------------------------------- Услуги
  const u = wb.addWorksheet("Услуги", { views: [{ state: "frozen", ySplit: 3 }] });
  title(u, "Выручка по услугам и товарам", periodText);
  const uTotalRow = 4 + report.services.length;
  const svcRevenue = report.services.reduce((a, x) => a + x.revenue, 0);
  const svcCount = report.services.reduce((a, x) => a + x.count, 0);
  table(
    u,
    3,
    [
      { header: "Услуга / товар", width: 36 },
      { header: "Категория", width: 22 },
      { header: "Продаж", width: 10, fmt: "#,##0" },
      { header: "Выручка", width: 16, fmt: MONEY },
      { header: "Средний чек", width: 15, fmt: MONEY },
      { header: "Доля выручки", width: 13, fmt: PCT },
    ],
    report.services.map((x, i) => {
      const r = 4 + i;
      return [x.name, x.category, x.count, x.revenue, f(`IF(C${r}=0,0,D${r}/C${r})`, ratio(x.revenue, x.count)), f(`IF($D$${uTotalRow}=0,0,D${r}/$D$${uTotalRow})`, ratio(x.revenue, svcRevenue))];
    }),
    ["Итого", "", f(`SUM(C4:C${uTotalRow - 1})`, svcCount), f(`SUM(D4:D${uTotalRow - 1})`, svcRevenue), f(`IF(C${uTotalRow}=0,0,D${uTotalRow}/C${uTotalRow})`, ratio(svcRevenue, svcCount)), f(`IF(D${uTotalRow}=0,0,1)`, svcRevenue ? 1 : 0)],
  );

  // ---------------------------------------------------------------- Расходы
  const e = wb.addWorksheet("Расходы", { views: [{ state: "frozen", ySplit: 3 }] });
  title(e, "Расходы по категориям", m.hasPrev ? `${periodText} · сравнение с прошлым периодом` : periodText);
  const eTotalRow = 4 + report.expenses.length;
  const prevExp = report.expenses.reduce((a, x) => a + x.prev, 0);
  table(
    e,
    3,
    [
      { header: "Категория", width: 30 },
      { header: "Сумма", width: 16, fmt: MONEY },
      { header: "Доля", width: 10, fmt: PCT },
      { header: "Прошлый период", width: 17, fmt: MONEY },
      { header: "Изменение", width: 12, fmt: DELTA },
    ],
    report.expenses.map((x, i) => {
      const r = 4 + i;
      return [x.category, x.amount, f(`IF($B$${eTotalRow}=0,0,B${r}/$B$${eTotalRow})`, ratio(x.amount, t.expense)), x.prev, f(`IF(D${r}=0,"",B${r}/D${r}-1)`, x.prev ? x.amount / x.prev - 1 : "")];
    }),
    ["Итого", f(`SUM(B4:B${eTotalRow - 1})`, t.expense), f(`IF(B${eTotalRow}=0,0,1)`, t.expense ? 1 : 0), f(`SUM(D4:D${eTotalRow - 1})`, prevExp), f(`IF(D${eTotalRow}=0,"",B${eTotalRow}/D${eTotalRow}-1)`, prevExp ? t.expense / prevExp - 1 : "")],
  );

  // ---------------------------------------------------------------- Сотрудники
  const st = wb.addWorksheet("Сотрудники", { views: [{ state: "frozen", ySplit: 3 }] });
  title(st, "Показатели сотрудников", periodText);
  const stTotalRow = 4 + report.team.length;
  const teamRevenue = report.team.reduce((a, x) => a + x.revenue, 0);
  const teamSales = report.team.reduce((a, x) => a + x.sales, 0);
  table(
    st,
    3,
    [
      { header: "Сотрудник", width: 24 },
      { header: "Должность", width: 24 },
      { header: "Смена", width: 13 },
      { header: "Выручка", width: 16, fmt: MONEY },
      { header: "Продаж", width: 10, fmt: "#,##0" },
      { header: "Средний чек", width: 15, fmt: MONEY },
      { header: "Конверсия", width: 11, fmt: PCT },
      { header: "Рейтинг", width: 9, fmt: "0.0" },
      { header: "Ответ, мин", width: 11, fmt: "0.0" },
    ],
    report.team.map((x, i) => {
      const r = 4 + i;
      return [x.name, x.role, x.shift, x.revenue, x.sales, f(`IF(E${r}=0,0,D${r}/E${r})`, ratio(x.revenue, x.sales)), x.conversion, x.rating, x.responseMin];
    }),
    ["Итого по команде", "", "", f(`SUM(D4:D${stTotalRow - 1})`, teamRevenue), f(`SUM(E4:E${stTotalRow - 1})`, teamSales), f(`IF(E${stTotalRow}=0,0,D${stTotalRow}/E${stTotalRow})`, ratio(teamRevenue, teamSales)), "", "", ""],
  );

  // ---------------------------------------------------------------- Операции
  const o = wb.addWorksheet("Операции", { views: [{ state: "frozen", ySplit: 3 }] });
  title(o, "Все операции", `${periodText} · ${report.operations.length} операций`);
  const oLast = 3 + report.operations.length;
  table(
    o,
    3,
    [
      { header: "Дата и время", width: 17, fmt: DATETIME, align: "left" },
      { header: "Тип", width: 9 },
      { header: "Категория", width: 22 },
      { header: "Описание", width: 40 },
      { header: "Клиент", width: 22 },
      { header: "Сотрудник", width: 22 },
      { header: "Сумма", width: 15, fmt: MONEY },
    ],
    report.operations.map((x) => [xd(x.date), x.type, x.category, x.description, x.client, x.employee, x.amount]),
    ["Итого (доход − расход)", "", "", "", "", "", f(`SUM(G4:G${oLast})`, t.profit)],
  );
  o.autoFilter = { from: { row: 3, column: 1 }, to: { row: oLast, column: 7 } };

  // ---------------------------------------------------------------- Документы
  const dc = wb.addWorksheet("Документы", { views: [{ state: "frozen", ySplit: 3 }] });
  title(dc, "Счета, акты и накладные", periodText);
  const dcLast = 3 + report.documents.length;
  table(
    dc,
    3,
    [
      { header: "Номер", width: 12 },
      { header: "Документ", width: 26 },
      { header: "Контрагент", width: 26 },
      { header: "Дата", width: 12, fmt: DATE, align: "left" },
      { header: "Сумма", width: 15, fmt: MONEY },
      { header: "Статус", width: 12 },
      { header: "Создал агент", width: 13, align: "center" },
    ],
    report.documents.map((x) => [x.number, x.kind, x.counterparty, xd(x.date), x.total, x.status, x.byAgent ? "Да" : "Нет"]),
    ["Итого", "", "", "", f(`SUM(E4:E${Math.max(4, dcLast)})`, report.documents.reduce((a, x) => a + x.total, 0)), "", ""],
  );

  // ---------------------------------------------------------------- Налоги
  const tx = wb.addWorksheet("Налоги", { views: [{ showGridLines: false }] });
  title(tx, "Налоги ИП: упрощённая декларация (форма 910)", `Прогноз за ${report.tax.periodLabel}`);
  table(
    tx,
    3,
    [
      { header: "Показатель", width: 40 },
      { header: "Значение", width: 18, fmt: MONEY },
    ],
    [
      ["Доход с начала полугодия (оценка)", report.tax.income],
      ["Прогноз дохода за полугодие", report.tax.projected],
      ["Ставка налога", report.tax.ratePct / 100],
      ["Налог к уплате (прогноз)", f("B5*B6", report.tax.tax)],
      ["Соцплатежи за сотрудников в месяц (оценка)", report.tax.socialMonthly],
    ],
  );
  tx.getCell("B6").numFmt = "0%";
  tx.getCell("B7").font = { bold: true, color: { argb: BRAND } };
  const dlStart = 11;
  tx.getCell(`A${dlStart - 1}`).value = "Календарь платежей и отчётности";
  tx.getCell(`A${dlStart - 1}`).font = { bold: true, size: 12, color: { argb: BRAND } };
  table(
    tx,
    dlStart,
    [
      { header: "Что сделать", width: 40 },
      { header: "Сумма", width: 18, fmt: MONEY },
      { header: "Срок", width: 22 },
    ],
    report.tax.deadlines.map((dl) => [dl.title, dl.amount ?? "", dl.date]),
  );
  tx.getCell(`A${dlStart + report.tax.deadlines.length + 2}`).value =
    "Базовая ставка 4% от дохода (НК РК 2026); маслихат может изменить её на ±50%. Это оценка — сверяйте с кабинетом налогоплательщика.";
  tx.getCell(`A${dlStart + report.tax.deadlines.length + 2}`).font = { italic: true, size: 9, color: { argb: "FF8A87A0" } };

  // Печать: альбомная, по ширине страницы
  for (const ws of wb.worksheets) {
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  }

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export function reportFileName(data: BusinessData, now = new Date()) {
  const name = data.name.replace(/^.*«|»$/g, "").replace(/[\\/:*?"<>|]/g, "");
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `Отчёт о заработке — ${name} — ${date}.xlsx`;
}

/** Собрать отчёт и сохранить файл .xlsx на устройство */
export async function downloadExcelReport(data: BusinessData, period: ReportPeriod) {
  const report = buildReport(data, period);
  const buffer = await buildWorkbook(report);
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const fileName = reportFileName(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { fileName, size: blob.size, report };
}
