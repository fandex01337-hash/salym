"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FaqItem, Service } from "@/lib/data/types";
import { uid } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";

export function KnowledgeEditor() {
  const data = useData();
  const setKnowledge = useAppStore((s) => s.setKnowledge);
  const setServices = useAppStore((s) => s.setServices);
  const addActivity = useAppStore((s) => s.addActivity);
  const [services, setLocalServices] = useState<Service[]>(data.services);
  const [info, setInfo] = useState({ address: data.knowledge.address, phone: data.knowledge.phone, hours: data.knowledge.hours, instagram: data.knowledge.instagram });
  const [faq, setFaq] = useState<FaqItem[]>(data.knowledge.faq);
  const [rules, setRules] = useState<string[]>(data.knowledge.rules);
  const [newRule, setNewRule] = useState("");

  const save = () => {
    setServices(services.filter((s) => s.name.trim()));
    setKnowledge({ ...info, faq: faq.filter((f) => f.q.trim()), rules });
    addActivity({ kind: "insight", text: "Обновил базу знаний: услуги, цены, FAQ и правила", href: "/settings" });
    toast.success("Агент запомнил изменения", { description: "Новые данные уже используются в ответах клиентам" });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Услуги и цены</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setLocalServices((s) => [...s, { id: uid("svc"), name: "", price: 0, category: "Прочее" }])}>
              <Plus /> Добавить
            </Button>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-1.5 overflow-y-auto scrollbar-thin">
            {services.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1.5 sm:gap-2">
                <Input value={s.name} placeholder="Название" onChange={(e) => setLocalServices((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="h-8" />
                <div className="relative w-[92px] shrink-0 sm:w-32">
                  <Input type="number" value={s.price} onChange={(e) => setLocalServices((list) => list.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) || 0 } : x)))} className="h-8 pr-6 text-right" />
                  <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">₸</span>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => setLocalServices((list) => list.filter((_, j) => j !== i))} aria-label="Удалить">
                  <Trash2 />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Контакты и график</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["address", "Адрес"],
                  ["phone", "Телефон"],
                  ["hours", "График работы"],
                  ["instagram", "Instagram"],
                ] as const
              ).map(([k, l]) => (
                <div key={k} className="grid gap-1.5">
                  <Label>{l}</Label>
                  <Input value={info[k]} onChange={(e) => setInfo((v) => ({ ...v, [k]: e.target.value }))} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Правила для агента</CardTitle>
              <p className="text-xs text-muted-foreground">Агент никогда их не нарушает</p>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {rules.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm">
                  <span className="flex-1">{r}</span>
                  <button onClick={() => setRules((list) => list.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground" aria-label="Удалить правило">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newRule.trim()) return;
                  setRules((r) => [...r, newRule.trim()]);
                  setNewRule("");
                }}
                className="flex gap-2 pt-1"
              >
                <Input value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="Например: не записывать позже 20:00" className="h-8" />
                <Button size="sm" variant="outline" type="submit">
                  <Plus />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Частые вопросы (FAQ)</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setFaq((f) => [...f, { q: "", a: "" }])}>
            <Plus /> Добавить вопрос
          </Button>
        </CardHeader>
        <CardContent className="grid gap-2 lg:grid-cols-2">
          {faq.map((f, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border p-3">
              <div className="flex gap-2">
                <Input value={f.q} placeholder="Вопрос" onChange={(e) => setFaq((list) => list.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} className="h-8 font-medium" />
                <Button size="icon-sm" variant="ghost" onClick={() => setFaq((list) => list.filter((_, j) => j !== i))} aria-label="Удалить">
                  <Trash2 />
                </Button>
              </div>
              <Input value={f.a} placeholder="Ответ" onChange={(e) => setFaq((list) => list.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} className="h-8" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-10 flex justify-end md:bottom-4">
        <Button variant="ai" size="lg" onClick={save} className="w-full shadow-lg sm:w-auto">
          <Save /> Сохранить в память агента
        </Button>
      </div>
    </div>
  );
}
