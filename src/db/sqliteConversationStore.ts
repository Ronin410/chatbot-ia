import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import type { ConversationLogEntry, ConversationStore, StoredConversation } from "./types";

const DEFAULT_DB_PATH = path.resolve(process.cwd(), "data", "conversations.sqlite");

/**
 * Log de conversaciones en SQLite (Standard). Simple y sin servidor
 * aparte: suficiente para el reporte básico de mensajes/respuestas del
 * nivel Standard. Premium migra las acciones estructuradas a Postgres
 * (ver src/actions), pero el log de conversaciones puede seguir aquí.
 */
export function createSqliteConversationStore(dbPath?: string): ConversationStore {
  const resolvedPath = dbPath || process.env.SQLITE_PATH || DEFAULT_DB_PATH;
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      channel TEXT NOT NULL,
      message TEXT NOT NULL,
      reply TEXT NOT NULL
    );
  `);

  const insertStmt = db.prepare(
    "INSERT INTO conversations (timestamp, channel, message, reply) VALUES (@timestamp, @channel, @message, @reply)"
  );
  const selectAllStmt = db.prepare("SELECT * FROM conversations ORDER BY id ASC");

  return {
    async logConversation(entry: ConversationLogEntry): Promise<void> {
      insertStmt.run(entry);
    },

    async listConversations(): Promise<StoredConversation[]> {
      return selectAllStmt.all() as StoredConversation[];
    },

    async exportConversations(format: "csv" | "json"): Promise<string> {
      const rows = selectAllStmt.all() as StoredConversation[];

      if (format === "json") {
        return JSON.stringify(rows, null, 2);
      }

      const header = "id,timestamp,channel,message,reply";
      const csvRows = rows.map((row) =>
        [row.id, row.timestamp, row.channel, row.message, row.reply].map(csvEscape).join(",")
      );
      return [header, ...csvRows].join("\n");
    },
  };
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
