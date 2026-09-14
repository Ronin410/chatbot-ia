import path from "node:path";
import { randomUUID } from "node:crypto";
import { chunkText } from "./chunker";
import { loadDocumentText } from "./loadDocumentText";
import { createEmbeddings, cosineSimilarity } from "./embeddingsClient";
import { JsonVectorStore } from "./vectorStore";
import type { RagIndex, ScoredChunk } from "./types";

export type { DocumentChunk, RagIndex, ScoredChunk } from "./types";

const DEFAULT_STORE_PATH = path.resolve(process.cwd(), "data", "rag-index.json");
const DEFAULT_MIN_SCORE = 0.75;

export interface RagIndexOptions {
  /** Ruta del archivo JSON donde se persisten los chunks+embeddings. */
  storePath?: string;
  /** Similitud coseno mínima para considerar un chunk relevante (0-1). */
  minScore?: number;
}

/**
 * RAG básico (Standard): indexa documentos del negocio (txt/md/pdf) y
 * recupera los fragmentos más relevantes para inyectarlos en el prompt de
 * sistema antes de llamar al modelo (ver src/ai/systemPrompt.ts).
 */
export function createRagIndex(options: RagIndexOptions = {}): RagIndex {
  const storePath = options.storePath || process.env.RAG_STORE_PATH || DEFAULT_STORE_PATH;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const store = new JsonVectorStore(storePath);

  return {
    isEmpty: () => store.isEmpty(),

    async indexDocument(documentPath: string): Promise<void> {
      const text = await loadDocumentText(documentPath);
      const rawChunks = chunkText(text);
      if (rawChunks.length === 0) {
        console.warn(`[rag] "${documentPath}" no produjo contenido indexable.`);
        return;
      }

      const embeddings = await createEmbeddings(rawChunks);
      const chunks = rawChunks.map((chunkedText, i) => ({
        id: randomUUID(),
        text: chunkedText,
        embedding: embeddings[i],
        sourceDocument: documentPath,
      }));

      store.replaceDocumentChunks(documentPath, chunks);
      console.log(`[rag] Indexado "${documentPath}": ${chunks.length} chunks.`);
    },

    async retrieveContext(query: string, topK = 3): Promise<string> {
      const all = store.getAll();
      if (all.length === 0) return "";

      const [queryEmbedding] = await createEmbeddings([query]);

      const scored: ScoredChunk[] = all
        .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter((chunk) => chunk.score >= minScore);

      if (scored.length === 0) return "";

      return scored
        .map((chunk, i) => `[Fragmento ${i + 1} de ${path.basename(chunk.sourceDocument)}]\n${chunk.text}`)
        .join("\n\n");
    },
  };
}
