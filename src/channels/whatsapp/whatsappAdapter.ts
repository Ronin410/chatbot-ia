/**
 * Adaptador de WhatsApp Business (Standard+).
 *
 * NO IMPLEMENTADO en el nivel Basic. Se deja la interfaz definida para que,
 * al activar Standard, solo haya que:
 *  1. Implementar `parseIncomingMessage` y `sendMessage` para el proveedor
 *     elegido (Twilio o Meta Cloud API, ver WHATSAPP_PROVIDER en .env).
 *  2. Montar el webhook en server.ts y reusar `createChatController`
 *     (o la lógica de src/channels/web/chatController.ts) para generar
 *     la respuesta antes de reenviarla por WhatsApp.
 */

export type WhatsappProvider = "twilio" | "meta";

export interface IncomingWhatsappMessage {
  from: string;
  text: string;
  channel: "whatsapp";
}

export interface WhatsappAdapter {
  /** Extrae el mensaje entrante desde el payload crudo del webhook del proveedor. */
  parseIncomingMessage(rawPayload: unknown): IncomingWhatsappMessage;
  /** Envía una respuesta de texto al usuario por WhatsApp. */
  sendMessage(to: string, text: string): Promise<void>;
}

export function createWhatsappAdapter(_provider: WhatsappProvider): WhatsappAdapter {
  throw new Error(
    "WhatsApp adapter no implementado todavía: funcionalidad de nivel Standard. " +
      "Ver src/channels/whatsapp/whatsappAdapter.ts"
  );
}
