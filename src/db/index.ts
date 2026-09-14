export type { Channel } from "../channels/types";
export type { ConversationLogEntry, ConversationStore, StoredConversation } from "./types";
export { createSqliteConversationStore } from "./sqliteConversationStore";

/**
 * Punto de extensión para Premium: además del log de conversaciones
 * (SQLite, arriba), Premium agrega un esquema real en PostgreSQL para
 * citas/pedidos consultado desde src/actions. Ver la carpeta db/ en la
 * rama de Premium (`schema.sql`, `pgPool.ts`) para esa parte.
 */
