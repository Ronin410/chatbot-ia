import type { AiProvider } from "../config/types";
import type { AiClient } from "./types";
import { OpenAiClient } from "./openaiClient";
import { AnthropicClient } from "./anthropicClient";

/**
 * Selecciona el cliente de IA según config del negocio / variable de entorno.
 * Basic usa un solo proveedor a la vez; Standard/Premium podrían extender
 * esto para fallback entre proveedores o function calling.
 */
export function selectAiClient(provider: AiProvider): AiClient {
  switch (provider) {
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("Falta OPENAI_API_KEY en el entorno");
      return new OpenAiClient(apiKey, process.env.OPENAI_MODEL || "gpt-4o-mini");
    }
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY en el entorno");
      return new AnthropicClient(apiKey, process.env.ANTHROPIC_MODEL || "claude-sonnet-5");
    }
    default:
      throw new Error(`Proveedor de IA no soportado: ${provider}`);
  }
}
