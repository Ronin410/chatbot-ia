export interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
  /** Ruta/nombre del documento de origen, para poder re-indexar solo ese archivo. */
  sourceDocument: string;
}

export interface ScoredChunk extends DocumentChunk {
  score: number;
}

export interface RagIndex {
  /** Extrae texto, hace chunking, genera embeddings e indexa un documento. */
  indexDocument(documentPath: string): Promise<void>;
  /** Recupera el contexto más relevante para una consulta, como texto listo para el prompt. */
  retrieveContext(query: string, topK?: number): Promise<string>;
  isEmpty(): boolean;
}
