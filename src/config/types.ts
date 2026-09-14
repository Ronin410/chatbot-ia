/**
 * Tipos de configuración de negocio, compartidos por todos los niveles
 * (Basic / Standard / Premium). Cada cliente tiene su propio
 * `business-config.json` con esta forma.
 */

export interface FaqEntry {
  question: string;
  answer: string;
}

export type AiProvider = "openai" | "anthropic";

export type ServiceLevel = "basic" | "standard" | "premium";

export interface BusinessConfig {
  businessName: string;
  /** Descripción de tono/estilo para el prompt de sistema. */
  tone: string;
  /** Idioma por defecto (ISO 639-1). Standard+ puede detectar y responder en el idioma del usuario. */
  language: string;
  level: ServiceLevel;
  /** Proveedor de IA para este cliente. Basic soporta solo uno a la vez. */
  aiProvider: AiProvider;
  /** FAQ estático (hasta 10 preguntas en Basic). */
  faq: FaqEntry[];
  /** Mensaje cuando el bot no tiene la respuesta en su FAQ/contexto. */
  fallbackMessage: string;
  /** Mensaje genérico cuando falla la llamada al modelo de IA. */
  errorMessage: string;
}
