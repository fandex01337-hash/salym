import Anthropic from "@anthropic-ai/sdk";

export interface ProviderInfo {
  kind: "anthropic" | "openai";
  label: string;
  model: string;
}

export function getProvider(): ProviderInfo | null {
  if (process.env.ANTHROPIC_API_KEY) {
    const model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
    return { kind: "anthropic", label: "Claude", model };
  }
  if (process.env.OPENAI_API_KEY) {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    return { kind: "openai", label: "OpenAI", model };
  }
  return null;
}

export interface AiRequest {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens: number;
}

/** Возвращает поток текстовых фрагментов от выбранного провайдера */
export async function* streamFromProvider(p: ProviderInfo, req: AiRequest): AsyncGenerator<string> {
  if (p.kind === "anthropic") {
    yield* streamAnthropic(p.model, req);
  } else {
    yield* streamOpenAI(p.model, req);
  }
}

async function* streamAnthropic(model: string, req: AiRequest): AsyncGenerator<string> {
  const client = new Anthropic();
  const params = {
    model,
    max_tokens: req.maxTokens,
    system: req.system,
    messages: req.messages,
    // Короткие ответы в чате — низкое усилие, чтобы демо отвечало быстро
    output_config: { effort: "low" },
  };
  const stream = client.messages.stream(params as unknown as Parameters<typeof client.messages.stream>[0]);
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

async function* streamOpenAI(model: string, req: AiRequest): AsyncGenerator<string> {
  // Пользователь явно попросил опцию OpenAI — используем REST-эндпоинт Chat Completions со стримингом.
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: req.maxTokens,
      messages: [{ role: "system", content: req.system }, ...req.messages],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`OpenAI ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        /* неполная строка — пропускаем */
      }
    }
  }
}
