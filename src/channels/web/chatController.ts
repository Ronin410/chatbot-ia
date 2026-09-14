import type { Request, Response } from "express";
import type { ChatMessage } from "../../ai/types";
import type { createChatEngine } from "../chatEngine";

/** Historial corto máximo que se acepta por request (Basic: sin persistencia entre sesiones). */
const MAX_HISTORY_MESSAGES = 10;

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
}

/**
 * Handler del endpoint POST /chat (canal web).
 * El cliente (widget) es responsable de reenviar el historial corto de la
 * conversación actual en cada request; el servidor no lo persiste (Basic).
 * Standard+ además registra la conversación si se configura un
 * `conversationStore` en el chatEngine.
 */
export function createChatController(chatEngine: ReturnType<typeof createChatEngine>) {
  return async function handleChat(req: Request, res: Response): Promise<void> {
    const body = req.body as ChatRequestBody;
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      res.status(400).json({ error: "El campo 'message' es requerido." });
      return;
    }

    const history = sanitizeHistory(body.history);
    const { reply, usedFallback } = await chatEngine.generateReply({
      message,
      history,
      channel: "web",
    });

    res.json(usedFallback ? { reply, error: true } : { reply });
  };
}

function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];

  const history: ChatMessage[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      (item as ChatMessage).role &&
      typeof (item as ChatMessage).content === "string" &&
      ["user", "assistant"].includes((item as ChatMessage).role)
    ) {
      history.push({ role: (item as ChatMessage).role, content: (item as ChatMessage).content });
    }
  }

  return history.slice(-MAX_HISTORY_MESSAGES);
}
