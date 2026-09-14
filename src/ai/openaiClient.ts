import type { AiClient, CompletionRequest, CompletionResult } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Cliente mínimo de OpenAI usando fetch nativo (Node 18+), sin depender del
 * SDK oficial para mantener el scaffold liviano. Se puede reemplazar por
 * el SDK `openai` sin cambiar el contrato `AiClient`.
 */
export class OpenAiClient implements AiClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gpt-4o-mini",
    private readonly timeoutMs: number = 15_000
  ) {}

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: request.systemPrompt },
            ...request.history.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: request.userMessage },
          ],
          temperature: 0.4,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`OpenAI API error ${response.status}: ${body}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error("OpenAI API: respuesta vacía");

      return { reply };
    } finally {
      clearTimeout(timeout);
    }
  }
}
