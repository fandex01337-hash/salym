"use client";

import { ChevronDown, Zap } from "lucide-react";
import { ChannelIcon, CHANNEL_META } from "@/components/shared/channel-icon";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Channel } from "@/lib/data/types";

const LIST: Channel[] = ["instagram", "whatsapp", "telegram", "website", "2gis"];

export function SimulateButton({ onSimulate }: { onSimulate: (c?: Channel) => void }) {
  return (
    <div className="flex w-full sm:w-auto">
      <Button variant="ai" className="flex-1 rounded-r-none sm:flex-none" onClick={() => onSimulate()}>
        <Zap /> Симулировать входящее
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ai" size="icon" className="shrink-0 rounded-l-none border-l border-white/25" aria-label="Выбрать канал">
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Входящее из канала</DropdownMenuLabel>
          {LIST.map((c) => (
            <DropdownMenuItem key={c} onClick={() => onSimulate(c)}>
              <ChannelIcon id={c} size={18} /> {CHANNEL_META[c].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
