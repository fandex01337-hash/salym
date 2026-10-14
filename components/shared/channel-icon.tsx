import { Globe } from "lucide-react";
import type { ConnectorId } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export const CHANNEL_META: Record<ConnectorId, { label: string; bg: string }> = {
  instagram: { label: "Instagram", bg: "bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" },
  whatsapp: { label: "WhatsApp", bg: "bg-[#25D366]" },
  telegram: { label: "Telegram", bg: "bg-[#229ED9]" },
  website: { label: "Сайт", bg: "bg-slate-600" },
  "2gis": { label: "2ГИС", bg: "bg-[#19AA1E]" },
  kaspi: { label: "Kaspi", bg: "bg-[#F14635]" },
};

function Glyph({ id }: { id: ConnectorId }) {
  const common = { viewBox: "0 0 24 24", fill: "none", className: "h-[62%] w-[62%]" } as const;
  switch (id) {
    case "instagram":
      return (
        <svg {...common} stroke="white" strokeWidth={2.2}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.6" fill="white" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common} fill="white">
          <path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.6a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.8Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.2-.2-.4-.3Z" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common} fill="white">
          <path d="M20.7 4.1 2.9 11c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.4c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.1c.3-1.2-.5-1.8-1.5-1.3ZM8.5 13.6l9.4-5.9c.5-.3.9-.1.5.2l-8 7.3-.3 3.3-1.6-4.9Z" />
        </svg>
      );
    case "2gis":
      return (
        <svg {...common} fill="white">
          <path d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.3 6.2 11.6 7 12.3a.7.7 0 0 0 1 0c.8-.7 7-7 7-12.3A7.5 7.5 0 0 0 12 2Zm0 10.3a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Z" />
        </svg>
      );
    case "kaspi":
      return (
        <svg {...common} fill="white">
          <path d="M7 4h3v6.5L15.6 4h3.7l-6 7 6.4 9h-3.8l-4.6-6.7L10 14.8V20H7z" />
        </svg>
      );
    default:
      return <Globe className="h-[60%] w-[60%] text-white" />;
  }
}

export function ChannelIcon({ id, size = 20, className }: { id: ConnectorId; size?: number; className?: string }) {
  return (
    <span
      title={CHANNEL_META[id].label}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[28%]", CHANNEL_META[id].bg, className)}
      style={{ width: size, height: size }}
    >
      <Glyph id={id} />
    </span>
  );
}
