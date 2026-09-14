import type { BusinessConfig } from "../config/types";
import type { Channel } from "./types";
import type { AiClient, ChatMessage, ToolCallRequest } from "../ai/types";
import { buildSystemPrompt } from "../ai/systemPrompt";
import type { RagIndex } from "../rag/types";
import type { ConversationStore } from "../db/types";
import type { ActionRegistry } from "../actions/types";
import { actionsToToolDefinitions } from "../actions";

export interface GenerateReplyParams {
  message: string;
  history: ChatMessage[];
  channel: Channel;
}

export interface ChatEngineDeps {
  config: BusinessConfig;
  aiClient: AiClient;
  /** Standard+: si se provee y tiene documentos indexados, se inyecta contexto RAG. */
  ragIndex?: RagIndex;
  /** Standard+: si se provee, cada intercambio se registra para el reporte de conversaciones. */
  conversationStore?: ConversationStore;
  /** Premium: si se provee, el modelo puede invocar estas acciones (function calling). */
  actionRegistry?: ActionRegistry;
}

export interface GenerateReplyResult {
  reply: string;
  /** true si se respondió con el mensaje de error genérico por fallo del modelo. */
  usedFallback: boolean;
}

/**
 * Núcleo de generación de respuestas, independiente del canal (web o
 * WhatsApp). Cada canal (src/channels/web, src/channels/whatsapp) solo se
 * encarga de recibir/enviar el mensaje por su transporte específico.
 */
export function createChatEngine(deps: ChatEngineDeps) {
  const tools = deps.actionRegistry ? actionsToToolDefinitions(deps.actionRegistry) : undefined;

  return {
    async generateReply({ message, history, channel }: GenerateReplyParams): Promise<GenerateReplyResult> {
      let reply: string;
      let usedFallback = false;

      try {
        let extraContext: string | undefined;
        if (deps.ragIndex && !deps.ragIndex.isEmpty()) {
          extraContext = await deps.ragIndex.retrieveContext(message);
        }

        const systemPrompt = buildSystemPrompt(deps.config, {
          extraContext,
          actionsEnabled: Boolean(tools && tools.length > 0),
        });

        if (tools && tools.length > 0 && deps.actionRegistry) {
          const registry = deps.actionRegistry;
          const result = await deps.aiClient.completeWithTools({
            systemPrompt,
            history,
            userMessage: message,
            tools,
            executeTool: (call: ToolCallRequest) => executeAction(registry, call),
          });
          reply = result.reply;
        } else {
          const result = await deps.aiClient.complete({ systemPrompt, history, userMessage: message });
          reply = result.reply;
        }
      } catch (error) {
        console.error(`[chatEngine] Error al generar respuesta (canal=${channel}):`, error);
        reply = deps.config.errorMessage;
        usedFallback = true;
      }

      if (deps.conversationStore) {
        try {
          await deps.conversationStore.logConversation({
            timestamp: new Date().toISOString(),
            channel,
            message,
            reply,
          });
        } catch (error) {
          console.error("[chatEngine] No se pudo guardar la conversación:", error);
        }
      }

      return { reply, usedFallback };
    },
  };
}

async function executeAction(registry: ActionRegistry, call: ToolCallRequest): Promise<unknown> {
  const action = registry.get(call.name);
  if (!action) {
    return { error: `Acción desconocida: "${call.name}"` };
  }

  try {
    return await action.execute(call.arguments);
  } catch (error) {
    console.error(`[chatEngine] Error ejecutando la acción "${call.name}":`, error);
    return { error: `No se pudo completar la acción "${call.name}".` };
  }
}
