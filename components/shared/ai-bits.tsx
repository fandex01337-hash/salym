import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiBadge({ className, label = "ИИ" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-white ai-gradient", className)}>
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

export function AgentAvatar({ size = 28, className, pulse }: { size?: number; className?: string; pulse?: boolean }) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {pulse && <span className="absolute inset-0 rounded-full ai-gradient animate-pulse-ring" />}
      <span className="relative inline-flex h-full w-full items-center justify-center rounded-full ai-gradient text-white shadow-sm">
        <Sparkles style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    </span>
  );
}

export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ai/70" style={{ animationDelay: `${i * 140}ms` }} />
      ))}
    </span>
  );
}
