import type { BusinessConfig } from "../config/types";
import type { Channel } from "./types";
import type { AiClient, ChatMessage } from "../ai/types";
import { buildSystemPrompt } from "../ai/systemPrompt";
import type { RagIndex } from "../rag/types";
import type { ConversationStore } from "../db/types";

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
  return {
    async generateReply({ message, history, channel }: GenerateReplyParams): Promise<GenerateReplyResult> {
      let reply: string;
      let usedFallback = false;

      try {
        let extraContext: string | undefined;
        if (deps.ragIndex && !deps.ragIndex.isEmpty()) {
          extraContext = await deps.ragIndex.retrieveContext(message);
        }

        const systemPrompt = buildSystemPrompt(deps.config, extraContext);
        const result = await deps.aiClient.complete({ systemPrompt, history, userMessage: message });
        reply = result.reply;
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
