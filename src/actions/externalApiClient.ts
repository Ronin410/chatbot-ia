/**
 * Cliente HTTP genérico para que una acción llame a la API de un sistema
 * externo del cliente (su CRM, su plataforma de pedidos, etc.) en vez de
 * escribir en nuestra propia Postgres. Mismo patrón de timeout con
 * AbortController que usan src/ai/openaiClient.ts y anthropicClient.ts.
 *
 * Ver src/actions/templates/crearPedidoSistemaExterno.ts para un ejemplo
 * completo de acción que lo usa.
 */

export interface ExternalApiRequest {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Se combinan con Content-Type: application/json (ej. el header de autenticación). */
  headers?: Record<string, string>;
  /** Se serializa a JSON automáticamente. Omite este campo para un GET sin cuerpo. */
  body?: unknown;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export async function callExternalApi<T = unknown>(request: ExternalApiRequest): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(request.url, {
      method: request.method ?? "POST",
      headers: { "Content-Type": "application/json", ...request.headers },
      body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`API externa respondió ${response.status}: ${bodyText}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
