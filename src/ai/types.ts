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
 * Contrato común para cualquier proveedor de IA (OpenAI, Anthropic, ...).
 * Standard/Premium pueden añadir métodos (p. ej. function calling) sin
 * romper esta interfaz base.
 */
export interface AiClient {
  complete(request: CompletionRequest): Promise<CompletionResult>;
}
