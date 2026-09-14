/**
 * Adaptador de WhatsApp Business (Standard+).
 *
 * Implementado para Twilio (WHATSAPP_PROVIDER=twilio), que es el camino
 * más simple para arrancar un pedido real. Meta Cloud API queda con la
 * misma interfaz pero sin implementar — ver `createMetaAdapter` más abajo
 * para la guía de qué reemplazar.
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

export function createWhatsappAdapter(provider: WhatsappProvider): WhatsappAdapter {
  switch (provider) {
    case "twilio":
      return createTwilioAdapter();
    case "meta":
      return createMetaAdapter();
    default:
      throw new Error(`Proveedor de WhatsApp no soportado: ${provider}`);
  }
}

// ---------------------------------------------------------------------------
// Twilio
// ---------------------------------------------------------------------------

interface TwilioIncomingPayload {
  From?: string; // "whatsapp:+521234567890"
  Body?: string;
  [key: string]: unknown;
}

function createTwilioAdapter(): WhatsappAdapter {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER; // "whatsapp:+14155238886"

  return {
    parseIncomingMessage(rawPayload: unknown): IncomingWhatsappMessage {
      const payload = rawPayload as TwilioIncomingPayload;
      const from = payload.From?.replace(/^whatsapp:/, "");
      const text = payload.Body?.trim();

      if (!from || !text) {
        throw new Error("Payload de Twilio inválido: falta 'From' o 'Body'.");
      }

      return { from, text, channel: "whatsapp" };
    },

    async sendMessage(to: string, text: string): Promise<void> {
      if (!accountSid || !authToken || !fromNumber) {
        throw new Error(
          "Faltan credenciales de Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER"
        );
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const body = new URLSearchParams({
        From: fromNumber,
        To: `whatsapp:${to}`,
        Body: text,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        },
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`Twilio API error ${response.status}: ${errorBody}`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Meta Cloud API — NO IMPLEMENTADO
// ---------------------------------------------------------------------------

function createMetaAdapter(): WhatsappAdapter {
  throw new Error(
    "WhatsApp vía Meta Cloud API no implementado todavía. Para activarlo: " +
      "1) parsear el payload del webhook de Meta " +
      "(entry[0].changes[0].value.messages[0].{from,text.body}); " +
      "2) enviar respuestas con POST a " +
      "https://graph.facebook.com/v19.0/<PHONE_NUMBER_ID>/messages " +
      "usando WHATSAPP_TOKEN como Bearer token. Usa createTwilioAdapter() de " +
      "este mismo archivo como referencia de estructura."
  );
}
