import type { AiClient, CompletionRequest, CompletionResult } from "./types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Cliente mínimo de Anthropic usando fetch nativo (Node 18+), sin depender
 * del SDK oficial para mantener el scaffold liviano. Se puede reemplazar por
 * el SDK `@anthropic-ai/sdk` sin cambiar el contrato `AiClient`.
 */
export class AnthropicClient implements AiClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "claude-sonnet-5",
    private readonly timeoutMs: number = 15_000
  ) {}

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          system: request.systemPrompt,
          max_tokens: 1024,
          messages: [
            ...request.history.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: request.userMessage },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Anthropic API error ${response.status}: ${body}`);
      }

      const data = (await response.json()) as {
        content?: { type: string; text?: string }[];
      };
      const reply = data.content?.find((block) => block.type === "text")?.text?.trim();
      if (!reply) throw new Error("Anthropic API: respuesta vacía");

      return { reply };
    } finally {
      clearTimeout(timeout);
    }
  }
}
