import { NextResponse } from "next/server";
import { getProvider } from "@/lib/server/ai-provider";

export const dynamic = "force-dynamic";

export function GET() {
  const p = getProvider();
  return NextResponse.json({ mode: p ? "live" : "demo", provider: p?.label ?? null });
}
