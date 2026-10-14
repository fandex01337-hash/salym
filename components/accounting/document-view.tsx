"use client";

import type { BizDocument } from "@/lib/data/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { useData } from "@/store/app-store";

export const DOC_KIND_LABEL: Record<BizDocument["kind"], string> = {
  invoice: "Счёт на оплату",
  act: "Акт выполненных работ (оказанных услуг)",
  waybill: "Накладная на отпуск запасов",
};

/** Документ в «бумажном» шаблоне. id="print-area" — печатается только он */
export function DocumentView({ doc }: { doc: BizDocument }) {
  const data = useData();
  const isIncoming = doc.kind === "waybill";
  const seller = isIncoming ? doc.counterparty : `ИП «${data.name.replace(/^.*«|»$/g, "")}» (${data.owner})`;
  const buyer = isIncoming ? `ИП «${data.name.replace(/^.*«|»$/g, "")}» (${data.owner})` : doc.counterparty;

  return (
    <div id="print-area" className="min-w-0 rounded-lg border bg-white p-4 text-[13px] sm:p-8 leading-relaxed text-zinc-900 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">{DOC_KIND_LABEL[doc.kind]}</div>
          <div className="mt-1 text-2xl font-semibold">№ {doc.number}</div>
          <div className="text-zinc-500">от {formatDate(doc.date, { withYear: true })}</div>
        </div>
        <div className="text-xs text-zinc-500 sm:text-right">
          <div className="text-sm font-semibold text-zinc-900">{data.name}</div>
          <div>{data.knowledge.address}</div>
          <div>{data.knowledge.phone}</div>
          <div>БИН/ИИН 890415400127</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 py-5 text-xs sm:grid-cols-2 sm:gap-6">
        <div>
          <div className="mb-1 font-medium uppercase tracking-wider text-zinc-500">{doc.kind === "invoice" ? "Поставщик" : "Исполнитель / отправитель"}</div>
          <div className="text-sm font-medium">{seller}</div>
          {!isIncoming && (
            <>
              <div>ИИК KZ72 722S 0000 1234 5678 · АО «Kaspi Bank»</div>
              <div>БИК CASPKZKA · Кбе 19</div>
            </>
          )}
        </div>
        <div>
          <div className="mb-1 font-medium uppercase tracking-wider text-zinc-500">{doc.kind === "invoice" ? "Покупатель" : "Заказчик / получатель"}</div>
          <div className="text-sm font-medium">{buyer}</div>
          <div>г. Тараз</div>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[420px] border-collapse text-xs">
        <thead>
          <tr className="bg-zinc-100 text-left">
            <th className="border border-zinc-200 px-2 py-1.5 font-medium">№</th>
            <th className="border border-zinc-200 px-2 py-1.5 font-medium">Наименование</th>
            <th className="border border-zinc-200 px-2 py-1.5 text-right font-medium">Кол-во</th>
            <th className="border border-zinc-200 px-2 py-1.5 text-right font-medium">Цена</th>
            <th className="border border-zinc-200 px-2 py-1.5 text-right font-medium">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={i}>
              <td className="border border-zinc-200 px-2 py-1.5">{i + 1}</td>
              <td className="border border-zinc-200 px-2 py-1.5">{it.name}</td>
              <td className="border border-zinc-200 px-2 py-1.5 text-right">{it.qty}</td>
              <td className="border border-zinc-200 px-2 py-1.5 text-right">{formatMoney(it.price)}</td>
              <td className="border border-zinc-200 px-2 py-1.5 text-right">{formatMoney(it.price * it.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Без НДС</span>
            <span>—</span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-1 text-base font-semibold">
            <span>Итого{doc.kind === "invoice" ? " к оплате" : ""}</span>
            <span>{formatMoney(doc.total)}</span>
          </div>
        </div>
      </div>

      {doc.kind === "invoice" && <p className="mt-4 text-xs text-zinc-500">Оплата через Kaspi QR или переводом по реквизитам. Счёт действителен 3 банковских дня.</p>}

      <div className="mt-10 grid grid-cols-2 gap-6 text-xs sm:gap-10">
        <div>
          <div className="border-b border-zinc-300 pb-6" />
          <div className="mt-1 text-zinc-500">{doc.kind === "invoice" ? "Руководитель" : "Сдал (исполнитель)"} · {data.owner}</div>
        </div>
        <div className="relative">
          <div className="border-b border-zinc-300 pb-6" />
          <div className="mt-1 text-zinc-500">{doc.kind === "invoice" ? "Бухгалтер" : "Принял (заказчик)"}</div>
          <div className="absolute -top-6 right-6 flex h-16 w-16 rotate-[-12deg] items-center justify-center rounded-full border-2 border-indigo-400/60 text-center text-[8px] font-semibold uppercase leading-tight text-indigo-500/70">
            {data.name.replace(/^.*«|»$/g, "")}
            <br />
            М.П.
          </div>
        </div>
      </div>
      {doc.byAgent && <div className="mt-6 text-center text-[10px] text-zinc-400">Документ сформирован ИИ-сотрудником «Салым» автоматически</div>}
    </div>
  );
}
