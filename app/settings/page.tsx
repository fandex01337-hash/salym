"use client";

import { useState } from "react";
import { Brain, Cable, Hand, RotateCcw, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeEditor } from "@/components/settings/knowledge";
import { ChannelIcon, CHANNEL_META } from "@/components/shared/channel-icon";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Autonomy, ConnectorId } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { useAppStore, useData } from "@/store/app-store";

const CONNECTORS: { id: ConnectorId; desc: string }[] = [
  { id: "instagram", desc: "Директ и комментарии" },
  { id: "whatsapp", desc: "WhatsApp Business API" },
  { id: "telegram", desc: "Бот и чат" },
  { id: "website", desc: "Виджет чата на сайте" },
  { id: "2gis", desc: "Отзывы и чат 2ГИС" },
  { id: "kaspi", desc: "Оплаты и Kaspi-магазин" },
];

const AUTONOMY: { id: Autonomy; title: string; text: string; icon: typeof Hand }[] = [
  { id: "suggest", title: "Только предлагает", text: "Агент готовит ответы, счета и посты, но отправляете вы.", icon: Hand },
  { id: "confirm", title: "Действует с подтверждением", text: "Рутину делает сам, а скидки, отказы и платежи — после вашего «ок».", icon: ShieldCheck },
  { id: "auto", title: "Полностью сам", text: "Отвечает, записывает, выставляет счета и публикует без участия людей.", icon: Zap },
];

export default function SettingsPage() {
  const data = useData();
  const toggleChannel = useAppStore((s) => s.toggleChannel);
  const setAutonomy = useAppStore((s) => s.setAutonomy);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div>
      <PageHeader title="Мозг агента" description="Общая память агента о бизнесе: всё, что здесь, используют все навыки — от чатов до бухгалтерии." icon={<Brain className="h-4 w-4" />} />
      <Tabs defaultValue="knowledge">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="knowledge" className="flex-1 sm:flex-none">
            <Brain /> <span className="sm:hidden">Знания</span><span className="hidden sm:inline">Что агент знает</span>
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex-1 sm:flex-none">
            <Cable /> Каналы
          </TabsTrigger>
          <TabsTrigger value="autonomy" className="flex-1 sm:flex-none">
            <Sparkles /> Автономность
          </TabsTrigger>
        </TabsList>
        <TabsContent value="knowledge">
          <KnowledgeEditor key={data.generatedAt} />
        </TabsContent>

        <TabsContent value="channels">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {CONNECTORS.map((c) => {
              const on = data.channels[c.id];
              return (
                <Card key={c.id} className={cn("flex items-center gap-3 p-4 transition", on && "ring-1 ring-emerald-500/30")}>
                  <ChannelIcon id={c.id} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{CHANNEL_META[c.id].label}</div>
                    <div className="text-xs text-muted-foreground">{c.desc}</div>
                    <Badge variant={on ? "success" : "secondary"} className="mt-1.5">
                      {on ? "Подключено" : "Отключено"}
                    </Badge>
                  </div>
                  <Switch
                    checked={on}
                    onCheckedChange={() => {
                      toggleChannel(c.id);
                      toast[on ? "info" : "success"](on ? `${CHANNEL_META[c.id].label} отключён` : `${CHANNEL_META[c.id].label} подключён`, {
                        description: on ? "Агент перестал принимать сообщения из этого канала" : "Агент начал отвечать в этом канале",
                      });
                    }}
                  />
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="autonomy">
          <div className="grid gap-3 lg:grid-cols-3">
            {AUTONOMY.map((a) => {
              const active = data.autonomy === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setAutonomy(a.id);
                    toast.success(`Режим: ${a.title.toLowerCase()}`);
                  }}
                  className={cn("rounded-xl border bg-card p-5 text-left transition hover:border-primary/40", active && "border-primary ring-2 ring-primary/25")}
                >
                  <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", active ? "ai-gradient text-white" : "bg-muted text-muted-foreground")}>
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div className="font-semibold">{a.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
                  {active && <Badge className="mt-3">Выбрано</Badge>}
                </button>
              );
            })}
          </div>
          <Card className="mt-6 border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">Демо-режим</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Вернуть все данные в исходное состояние перед показом. Горячая клавиша: Ctrl + Shift + R.</span>
              <Button variant="outline" onClick={() => setConfirmReset(true)}>
                <RotateCcw /> Сбросить демо
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сбросить демо?</DialogTitle>
            <DialogDescription>Новые заявки, счета, посты и изменения настроек будут удалены.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDemo();
                setConfirmReset(false);
                toast.success("Демо сброшено");
              }}
            >
              Сбросить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
