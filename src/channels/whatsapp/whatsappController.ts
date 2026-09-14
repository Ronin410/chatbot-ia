import type { Request, Response } from "express";
import type { ChatMessage } from "../../ai/types";
import type { createChatEngine } from "../chatEngine";
import type { WhatsappAdapter } from "./whatsappAdapter";

const MAX_HISTORY_MESSAGES = 10;

/**
 * A diferencia del widget web (que reenvía su propio historial en cada
 * request), el webhook de WhatsApp solo entrega el mensaje nuevo. Para dar
 * continuidad a la conversación se mantiene un historial corto en memoria
 * por número de teléfono. Se pierde si el proceso se reinicia — el log
 * persistente de conversaciones (src/db) es independiente de esto y no se
 * ve afectado.
 */
const historyByPhone = new Map<string, ChatMessage[]>();

export function createWhatsappController(
  chatEngine: ReturnType<typeof createChatEngine>,
  adapter: WhatsappAdapter
) {
  return async function handleWhatsappWebhook(req: Request, res: Response): Promise<void> {
    // Responde de inmediato al proveedor (evita reintentos/timeouts del webhook)
    // y procesa el mensaje en segundo plano.
    res.status(200).send("<Response></Response>");

    try {
      const incoming = adapter.parseIncomingMessage(req.body);
      const history = historyByPhone.get(incoming.from) || [];

      const { reply } = await chatEngine.generateReply({
        message: incoming.text,
        history,
        channel: "whatsapp",
      });

      const updatedHistory = [
        ...history,
        { role: "user" as const, content: incoming.text },
        { role: "assistant" as const, content: reply },
      ].slice(-MAX_HISTORY_MESSAGES);
      historyByPhone.set(incoming.from, updatedHistory);

      await adapter.sendMessage(incoming.from, reply);
    } catch (error) {
      console.error("[whatsapp] Error procesando mensaje entrante:", error);
    }
  };
}
