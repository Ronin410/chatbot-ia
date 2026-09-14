/**
 * Chunking simple por número de caracteres, con solape para no cortar
 * ideas a la mitad. Suficiente para un RAG básico (Standard); no hace
 * chunking semántico ni respeta límites de tokens exactos.
 */
export interface ChunkOptions {
  /** Tamaño objetivo de cada chunk, en caracteres. */
  chunkSize?: number;
  /** Caracteres de solape entre chunks consecutivos. */
  overlap?: number;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const chunkSize = options.chunkSize ?? 800;
  const overlap = options.overlap ?? 100;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const slice = normalized.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= normalized.length) break;
    start = end - overlap;
  }

  return chunks;
}
