export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompletionRequest {
  systemPrompt: string;
  /** Historial corto (Basic: sin persistencia entre sesiones, solo el de la request actual). */
  history: ChatMessage[];
  userMessage: string;
}

export interface CompletionResult {
  reply: string;
}

/**
 * Definición de una tool/función que el modelo puede invocar (Premium).
 * `parameters` es un JSON Schema (subset) describiendo los argumentos.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface CompleteWithToolsRequest {
  systemPrompt: string;
  history: ChatMessage[];
  userMessage: string;
  tools: ToolDefinition[];
  /**
   * Ejecuta una tool solicitada por el modelo y devuelve su resultado
   * (se serializa a JSON para devolvérselo al modelo). Quien la implemente
   * decide si de verdad ejecuta la acción o pide confirmación primero
   * (ver src/actions).
   */
  executeTool: (call: ToolCallRequest) => Promise<unknown>;
  /** Límite de idas y vueltas modelo↔tools antes de forzar una respuesta de texto. */
  maxRounds?: number;
}

/**
 * Contrato común para cualquier proveedor de IA (OpenAI, Anthropic, ...).
 */
export interface AiClient {
  complete(request: CompletionRequest): Promise<CompletionResult>;
  /**
   * Premium: variante con function calling. Cada implementación maneja
   * internamente el formato de "tools" y el ida-y-vuelta de resultados
   * específico de su API, y expone un resultado de texto ya resuelto.
   */
  completeWithTools(request: CompleteWithToolsRequest): Promise<CompletionResult>;
}
