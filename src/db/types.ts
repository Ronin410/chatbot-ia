import type { Channel } from "../channels/types";

export interface ConversationLogEntry {
  timestamp: string;
  channel: Channel;
  message: string;
  reply: string;
}

export interface StoredConversation extends ConversationLogEntry {
  id: number;
}

export interface ConversationStore {
  logConversation(entry: ConversationLogEntry): Promise<void>;
  listConversations(): Promise<StoredConversation[]>;
  exportConversations(format: "csv" | "json"): Promise<string>;
}
