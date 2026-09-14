import type { BusinessConfig } from "../config/types";

export interface BuildSystemPromptOptions {
  /** Standard+: fragmentos relevantes recuperados por RAG (ver src/rag). */
  extraContext?: string;
  /** Premium: si hay acciones/tools registradas, agrega la política de confirmación. */
  actionsEnabled?: boolean;
}

/**
 * Construye el prompt de sistema a partir de la config del negocio.
 * Basic: FAQ estático embebido directamente en el prompt.
 * Standard+: además puede recibir contexto recuperado por RAG (ver
 * src/rag) y, si `config.multiLanguage` está activo, detectar el idioma
 * del usuario en vez de forzar `config.language`.
 * Premium: si `actionsEnabled` es true, agrega la política de
 * confirmación antes de ejecutar acciones irreversibles (ver src/actions).
 */
export function buildSystemPrompt(config: BusinessConfig, options: BuildSystemPromptOptions = {}): string {
  const { extraContext, actionsEnabled } = options;
  const faqBlock = config.faq
    .map((entry, i) => `${i + 1}. P: ${entry.question}\n   R: ${entry.answer}`)
    .join("\n");

  const languageInstruction = config.multiLanguage
    ? `Detecta el idioma en el que escribe el usuario y responde siempre en ese mismo idioma. Si no puedes detectarlo, usa ${languageName(config.language)}.`
    : `Responde siempre en ${languageName(config.language)}, de forma breve y clara.`;

  const parts = [
    `Eres el asistente virtual de "${config.businessName}".`,
    `Tono: ${config.tone}`,
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

  if (actionsEnabled) {
    parts.push(
      `Tienes acceso a acciones (tools) para consultar o modificar datos reales del negocio. Reglas:`,
      `- Antes de ejecutar una acción que modifique algo (como agendar una cita), primero llámala en modo "no confirmado" para obtener un resumen, muéstraselo al usuario tal cual y espera su confirmación explícita en el chat.`,
      `- Solo ejecuta la acción de verdad (modo confirmado) después de que el usuario haya confirmado con claridad (por ejemplo "sí", "confirmo", "así está bien").`,
      `- Nunca inventes el resultado de una acción: si la tool falla o no encuentra datos, dilo tal cual al usuario.`,
      `- Las acciones de solo consulta (como revisar el estatus de un pedido) no requieren confirmación previa.`
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
