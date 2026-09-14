import type { BusinessConfig } from "../config/types";

/**
 * Construye el prompt de sistema a partir de la config del negocio.
 * Basic: FAQ estático embebido directamente en el prompt.
 * Standard+: además puede recibir contexto recuperado por RAG (ver
 * src/rag) y, si `config.multiLanguage` está activo, detectar el idioma
 * del usuario en vez de forzar `config.language`.
 */
export function buildSystemPrompt(config: BusinessConfig, extraContext?: string): string {
  const faqBlock = config.faq
    .map((entry, i) => `${i + 1}. P: ${entry.question}\n   R: ${entry.answer}`)
    .join("\n");

  const languageInstruction = config.multiLanguage
    ? `Detecta el idioma en el que escribe el usuario y responde siempre en ese mismo idioma. Si no puedes detectarlo, usa ${languageName(config.language)}.`
    : `Responde siempre en ${languageName(config.language)}, de forma breve y clara.`;

  const parts = [
    `Eres el asistente virtual de "${config.businessName}".`,
    `Tono: ${config.tone}`,
    `Hoy es ${formatToday(config.language)}. Usa esta fecha como referencia para interpretar expresiones relativas ("mañana", "la próxima semana", "el viernes") y fechas sin año — nunca asumas un año pasado.`,
    languageInstruction,
    `Usa la siguiente base de preguntas frecuentes como fuente principal de verdad:`,
    faqBlock,
    `Si la pregunta del usuario no está cubierta por la información anterior, responde exactamente con: "${config.fallbackMessage}"`,
    `No inventes información sobre precios, horarios o políticas que no estén arriba.`,
  ];

  if (extraContext) {
    parts.push(
      `Contexto adicional recuperado de los documentos del negocio (úsalo si es relevante, y priorízalo sobre la FAQ si hay conflicto porque suele ser más específico):`,
      extraContext
    );
  }

  return parts.join("\n\n");
}

function languageName(code: string): string {
  const names: Record<string, string> = {
    es: "español",
    en: "inglés",
    pt: "portugués",
    fr: "francés",
  };
  return names[code] || code;
}

/**
 * Fecha de hoy en texto legible, en el idioma base del negocio (ej.
 * "martes 14 de octubre de 2026"). Sin esto, el modelo no tiene forma de
 * saber qué día es "hoy" y puede asumir años equivocados al interpretar
 * fechas relativas u omitidas (ej. agendar una cita en un año pasado).
 */
function formatToday(language: string): string {
  const locales: Record<string, string> = { es: "es-ES", en: "en-US", pt: "pt-BR", fr: "fr-FR" };
  const locale = locales[language] || "es-ES";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}
