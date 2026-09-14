import type {
  AiClient,
  CompleteWithToolsRequest,
  CompletionRequest,
  CompletionResult,
  ToolCallRequest,
} from "./types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MAX_ROUNDS = 4;

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

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
    const messages: AnthropicMessage[] = [
      ...request.history.map((m) => ({ role: m.role, content: m.content }) as AnthropicMessage),
      { role: "user", content: request.userMessage },
    ];

    const data = await this.callMessages(request.systemPrompt, messages);
    const reply = extractText(data.content);
    if (!reply) throw new Error("Anthropic API: respuesta vacía");
    return { reply };
  }

  /**
   * Function calling (Premium): manda las tools disponibles; si el modelo
   * responde con bloques `tool_use` (stop_reason "tool_use"), las ejecuta
   * con `executeTool`, devuelve los resultados como `tool_result` y vuelve
   * a preguntar, hasta obtener una respuesta de texto o agotar `maxRounds`.
   */
  async completeWithTools(request: CompleteWithToolsRequest): Promise<CompletionResult> {
    const maxRounds = request.maxRounds ?? DEFAULT_MAX_ROUNDS;
    const tools = request.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));

    const messages: AnthropicMessage[] = [
      ...request.history.map((m) => ({ role: m.role, content: m.content }) as AnthropicMessage),
      { role: "user", content: request.userMessage },
    ];

    for (let round = 0; round < maxRounds; round++) {
      const data = await this.callMessages(request.systemPrompt, messages, tools);
      const toolUseBlocks = data.content.filter(
        (block): block is Extract<AnthropicContentBlock, { type: "tool_use" }> => block.type === "tool_use"
      );

      if (data.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
        const reply = extractText(data.content);
        if (!reply) throw new Error("Anthropic API: respuesta vacía");
        return { reply };
      }

      // El turno del asistente (con los bloques tool_use tal cual los
      // devolvió la API) se reenvía completo, seguido de un mensaje de
      // usuario con un tool_result por cada tool ejecutada.
      messages.push({ role: "assistant", content: data.content });

      const resultBlocks: AnthropicContentBlock[] = [];
      for (const block of toolUseBlocks) {
        const call: ToolCallRequest = { id: block.id, name: block.name, arguments: block.input };
        const result = await request.executeTool(call);
        resultBlocks.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
      }
      messages.push({ role: "user", content: resultBlocks });
    }

    throw new Error(`Anthropic API: se alcanzó el límite de ${maxRounds} rondas de tool calling`);
  }

  private async callMessages(
    systemPrompt: string,
    messages: AnthropicMessage[],
    tools?: { name: string; description: string; input_schema: Record<string, unknown> }[]
  ): Promise<{ content: AnthropicContentBlock[]; stop_reason?: string }> {
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
          system: systemPrompt,
          max_tokens: 1024,
          messages,
          ...(tools ? { tools } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Anthropic API error ${response.status}: ${body}`);
      }

      return (await response.json()) as { content: AnthropicContentBlock[]; stop_reason?: string };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function extractText(content: AnthropicContentBlock[]): string | undefined {
  return content
    .filter((block): block is Extract<AnthropicContentBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
