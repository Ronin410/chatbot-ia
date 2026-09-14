import type {
  AiClient,
  CompleteWithToolsRequest,
  CompletionRequest,
  CompletionResult,
  ToolCallRequest,
} from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MAX_ROUNDS = 4;

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

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
    const messages: OpenAiMessage[] = [
      { role: "system", content: request.systemPrompt },
      ...request.history.map((m) => ({ role: m.role, content: m.content }) as OpenAiMessage),
      { role: "user", content: request.userMessage },
    ];

    const data = await this.callChatCompletions(messages);
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("OpenAI API: respuesta vacía");
    return { reply };
  }

  /**
   * Function calling (Premium): manda las tools disponibles; si el modelo
   * pide ejecutar una o más, las ejecuta con `executeTool`, devuelve los
   * resultados y vuelve a preguntar, hasta obtener una respuesta de texto
   * o agotar `maxRounds`.
   */
  async completeWithTools(request: CompleteWithToolsRequest): Promise<CompletionResult> {
    const maxRounds = request.maxRounds ?? DEFAULT_MAX_ROUNDS;
    const tools = request.tools.map((tool) => ({
      type: "function" as const,
      function: { name: tool.name, description: tool.description, parameters: tool.parameters },
    }));

    const messages: OpenAiMessage[] = [
      { role: "system", content: request.systemPrompt },
      ...request.history.map((m) => ({ role: m.role, content: m.content }) as OpenAiMessage),
      { role: "user", content: request.userMessage },
    ];

    for (let round = 0; round < maxRounds; round++) {
      const data = await this.callChatCompletions(messages, tools);
      const message = data.choices?.[0]?.message;
      if (!message) throw new Error("OpenAI API: respuesta sin mensaje");

      if (!message.tool_calls || message.tool_calls.length === 0) {
        const reply = message.content?.trim();
        if (!reply) throw new Error("OpenAI API: respuesta vacía");
        return { reply };
      }

      // El mensaje del asistente con tool_calls se reenvía tal cual, más
      // un mensaje role:"tool" por cada resultado (formato esperado por la API).
      messages.push({ role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls });

      for (const toolCall of message.tool_calls) {
        const call: ToolCallRequest = {
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: safeParseJson(toolCall.function.arguments),
        };
        const result = await request.executeTool(call);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
    }

    throw new Error(`OpenAI API: se alcanzó el límite de ${maxRounds} rondas de tool calling`);
  }

  private async callChatCompletions(
    messages: OpenAiMessage[],
    tools?: { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } }[]
  ): Promise<{ choices?: { message?: { content?: string | null; tool_calls?: OpenAiToolCall[] } }[] }> {
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
          messages,
          temperature: 0.4,
          ...(tools ? { tools, tool_choice: "auto" } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`OpenAI API error ${response.status}: ${body}`);
      }

      return (await response.json()) as {
        choices?: { message?: { content?: string | null; tool_calls?: OpenAiToolCall[] } }[];
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`OpenAI API: argumentos de tool call no son JSON válido: ${raw}`);
  }
}
