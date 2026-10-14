"use client";

import { useState } from "react";
import { Play, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Knowledge } from "@/lib/data/types";
import { useAppStore, useData } from "@/store/app-store";

const VOICES = ["Айгуль (женский, тёплый)", "Данияр (мужской, спокойный)", "Мадина (женский, энергичный)"];

export function BotSettings() {
  const data = useData();
  const setKnowledge = useAppStore((s) => s.setKnowledge);
  const [greeting, setGreeting] = useState(data.knowledge.greeting);
  const [voice, setVoice] = useState(data.knowledge.voice);
  const [tone, setTone] = useState<Knowledge["tone"]>(data.knowledge.tone);
  const [sources, setSources] = useState({ faq: true, price: true, address: true, hours: true, promos: true });
  const [mode, setMode] = useState("always");

  const save = () => {
    setKnowledge({ greeting, voice, tone });
    toast.success("Настройки бота сохранены", { description: "Агент применит их ко всем каналам и звонкам" });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Голос и манера общения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label>Приветствие</Label>
            <Textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} className="min-h-[80px]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Голос</Label>
              <div className="flex gap-2">
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" aria-label="Прослушать" onClick={() => toast("▶ Пример голоса", { description: `«${greeting.slice(0, 70)}…»` })}>
                  <Play />
                </Button>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Тон</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as Knowledge["tone"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Дружелюбный</SelectItem>
                  <SelectItem value="formal">Официальный</SelectItem>
                  <SelectItem value="casual">Неформальный, на «ты»</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Когда отвечает ИИ</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Всегда, 24/7</SelectItem>
                <SelectItem value="offhours">Только в нерабочее время</SelectItem>
                <SelectItem value="busy">Когда администратор занят</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span>Языки: казахский и русский (определяет автоматически)</span>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>База знаний для звонков</CardTitle>
          <p className="text-xs text-muted-foreground">Агент берёт ответы из «Мозга агента»</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {(
            [
              ["faq", "Частые вопросы (FAQ)", `${data.knowledge.faq.length} ответов`],
              ["price", "Прайс-лист", `${data.services.length} позиций`],
              ["address", "Адрес и как добраться", data.knowledge.address],
              ["hours", "Часы работы", data.knowledge.hours],
              ["promos", "Текущие акции", "из модуля «Маркетинг»"],
            ] as const
          ).map(([key, label, hint]) => (
            <div key={key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{hint}</div>
              </div>
              <Switch checked={sources[key]} onCheckedChange={(v) => setSources((s) => ({ ...s, [key]: v }))} />
            </div>
          ))}
          <Button variant="ai" className="mt-2 w-full" onClick={save}>
            <Save /> Сохранить настройки
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
