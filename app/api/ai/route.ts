import { getProvider, streamFromProvider, type AiRequest } from "@/lib/server/ai-provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const provider = getProvider();
  if (!provider) {
    return Response.json({ error: "Ключ ИИ не задан — используется демо-режим" }, { status: 501 });
  }

  let body: AiRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const request: AiRequest = {
    system: String(body.system ?? ""),
    messages: (body.messages ?? []).filter((m) => m.content?.trim()).slice(-20),
    maxTokens: Math.min(Math.max(Number(body.maxTokens) || 1000, 100), 4000),
  };
  if (!request.messages.length || request.messages[0].role !== "user") {
    request.messages = [{ role: "user", content: "Привет" }, ...request.messages];
  }

  const iterator = streamFromProvider(provider, request);
  // Ждём первый фрагмент, чтобы ошибку провайдера вернуть кодом 502 (клиент переключится на демо)
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (e) {
    console.error("[Салым] Ошибка провайдера ИИ:", e);
    return Response.json({ error: "Провайдер ИИ недоступен" }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done && first.value) controller.enqueue(encoder.encode(first.value));
        if (!first.done) {
          for await (const chunk of { [Symbol.asyncIterator]: () => iterator }) {
            controller.enqueue(encoder.encode(chunk));
          }
        }
      } catch (e) {
        console.error("[Салым] Обрыв стрима ИИ:", e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
