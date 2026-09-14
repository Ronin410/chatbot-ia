import type { BusinessConfig } from "../config/types";

/**
 * Construye el prompt de sistema a partir de la config del negocio.
 * Basic: FAQ estático embebido directamente en el prompt.
 * Standard+ inyectará además contexto recuperado por RAG (ver src/rag).
 */
export function buildSystemPrompt(config: BusinessConfig, extraContext?: string): string {
  const faqBlock = config.faq
    .map((entry, i) => `${i + 1}. P: ${entry.question}\n   R: ${entry.answer}`)
    .join("\n");

  const parts = [
    `Eres el asistente virtual de "${config.businessName}".`,
    `Tono: ${config.tone}`,
    `Responde siempre en ${config.language === "es" ? "español" : config.language}, de forma breve y clara.`,
    `Usa la siguiente base de preguntas frecuentes como fuente principal de verdad:`,
    faqBlock,
    `Si la pregunta del usuario no está cubierta por la información anterior, responde exactamente con: "${config.fallbackMessage}"`,
    `No inventes información sobre precios, horarios o políticas que no estén arriba.`,
  ];

  if (extraContext) {
    parts.push(
      `Contexto adicional recuperado de los documentos del negocio (úsalo si es relevante):`,
      extraContext
    );
  }

  return parts.join("\n\n");
}
