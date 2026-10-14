"use client";

import { Clock, Inbox, PiggyBank, Target, TrendingUp } from "lucide-react";
import { CountUp } from "@/components/shared/count-up";
import { KpiCard } from "@/components/shared/kpi-card";
import { dashboardKpis } from "@/lib/analytics";
import { formatCompactMoney, formatMoney, formatNumber } from "@/lib/utils";
import { useData } from "@/store/app-store";

export function KpiRow() {
  const data = useData();
  const k = dashboardKpis(data);
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Заявки сегодня" value={<CountUp value={k.leadsToday} />} icon={<Inbox />} hint="из 5 каналов" />
      <KpiCard label="Выручка, 30 дней" value={<CountUp value={k.revenue} format={formatCompactMoney} />} icon={<TrendingUp />} delta={k.revenueDelta} hint="к прошлому" />
      <KpiCard label="Конверсия в оплату" value={<CountUp value={k.conversion} format={(v) => `${Math.round(v)}%`} />} icon={<Target />} hint="закрытые сделки" />
      <KpiCard label="Ответ агента" value={<CountUp value={k.responseSec} format={(v) => `${Math.round(v)} сек`} />} icon={<Clock />} hint="у людей ~18 мин" />
      <KpiCard
        accent
        label="Агент сэкономил"
        value={<CountUp value={k.savedHours} format={(v) => `${formatNumber(v)} ч`} />}
        icon={<PiggyBank />}
        hint={<span>≈ {formatMoney(k.savedMoney)} в месяц</span>}
        className="col-span-2 lg:col-span-1"
      />
    </div>
  );
}
