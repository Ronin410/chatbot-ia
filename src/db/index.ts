/**
 * Capa de base de datos (Standard+/Premium).
 *
 * NO IMPLEMENTADO en el nivel Basic (Basic no persiste conversaciones).
 * Interfaz definida para activar los niveles superiores sin tocar
 * src/channels ni src/ai:
 *  - Standard: SQLite. Log simple de conversaciones (timestamp, canal,
 *    mensaje, respuesta) + export a CSV/JSON.
 *  - Premium: PostgreSQL. Esquema real de citas/pedidos, consultado desde
 *    src/actions.
 */

export type Channel = "web" | "whatsapp";

export interface ConversationLogEntry {
  timestamp: string;
  channel: Channel;
  message: string;
  reply: string;
}

export interface ConversationStore {
  logConversation(entry: ConversationLogEntry): Promise<void>;
  exportConversations(format: "csv" | "json"): Promise<string>;
}

export function createConversationStore(): ConversationStore {
  throw new Error(
    "Persistencia de conversaciones no implementada todavía: funcionalidad de nivel Standard+. " +
      "Ver src/db/index.ts"
  );
}
