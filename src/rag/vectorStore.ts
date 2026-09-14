import fs from "node:fs";
import path from "node:path";
import type { DocumentChunk } from "./types";

/**
 * Almacén de vectores mínimo: un archivo JSON en disco con
 * `{ chunks: DocumentChunk[] }`. Suficiente para el volumen de documentos
 * de un RAG básico (Standard); para un catálogo grande convendría migrar
 * a una base vectorial real (pgvector, Pinecone, etc.) sin cambiar el
 * contrato `RagIndex` de src/rag/index.ts.
 */
export class JsonVectorStore {
  private chunks: DocumentChunk[] = [];

  constructor(private readonly filePath: string) {
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) {
      this.chunks = [];
      return;
    }
    const raw = fs.readFileSync(this.filePath, "utf-8");
    const parsed = raw.trim() ? JSON.parse(raw) : { chunks: [] };
    this.chunks = parsed.chunks || [];
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify({ chunks: this.chunks }, null, 2), "utf-8");
  }

  /** Reemplaza todos los chunks pertenecientes a un documento (re-indexado). */
  replaceDocumentChunks(sourceDocument: string, newChunks: DocumentChunk[]): void {
    this.chunks = this.chunks.filter((c) => c.sourceDocument !== sourceDocument);
    this.chunks.push(...newChunks);
    this.save();
  }

  getAll(): DocumentChunk[] {
    return this.chunks;
  }

  isEmpty(): boolean {
    return this.chunks.length === 0;
  }
}
