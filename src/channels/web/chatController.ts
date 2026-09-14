import type { Request, Response } from "express";
import type { BusinessConfig } from "../../config/types";
import type { ChatMessage } from "../../ai/types";
import { buildSystemPrompt } from "../../ai/systemPrompt";
import { selectAiClient } from "../../ai/selectAiClient";

/** Historial corto máximo que se acepta por request en Basic (sin persistencia). */
const MAX_HISTORY_MESSAGES = 10;

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
}

/**
 * Handler del endpoint POST /chat.
 * Basic: no hay memoria entre sesiones; el cliente (widget) es responsable
 * de reenviar el historial corto de la conversación actual en cada request.
 */
export function createChatController(config: BusinessConfig) {
  const aiClient = selectAiClient(config.aiProvider);

  return async function handleChat(req: Request, res: Response): Promise<void> {
    const body = req.body as ChatRequestBody;
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      res.status(400).json({ error: "El campo 'message' es requerido." });
      return;
    }

    const history = sanitizeHistory(body.history);
    const systemPrompt = buildSystemPrompt(config);

    try {
      const result = await aiClient.complete({
        systemPrompt,
        history,
        userMessage: message,
      });
      res.json({ reply: result.reply });
    } catch (error) {
      console.error("[/chat] Error al llamar al modelo de IA:", error);
      res.status(200).json({ reply: config.errorMessage, error: true });
    }
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
