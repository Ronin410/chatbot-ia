/**
 * RAG básico (Standard+): indexado de documentos del cliente (PDF/doc) y
 * búsqueda de contexto relevante antes de llamar al modelo.
 *
 * NO IMPLEMENTADO en el nivel Basic. Interfaz definida para activar
 * Standard sin reescribir el flujo de src/ai:
 *  1. `indexDocument`: chunking + generación de embeddings, persistidos
 *     (por ejemplo en SQLite o un archivo local para casos simples).
 *  2. `retrieveContext`: dado el mensaje del usuario, buscar los chunks
 *     más relevantes (similaridad de embeddings) y devolverlos como texto
 *     para pasarlos a `buildSystemPrompt(config, extraContext)`.
 */

export interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
}

export interface RagIndex {
  indexDocument(documentPath: string): Promise<void>;
  retrieveContext(query: string, topK?: number): Promise<string>;
}

export function createRagIndex(): RagIndex {
  throw new Error("RAG no implementado todavía: funcionalidad de nivel Standard. Ver src/rag/index.ts");
}
