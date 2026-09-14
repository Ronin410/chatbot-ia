import "dotenv/config";
import { createRagIndex } from "./index";

/**
 * Uso: npm run rag:index -- documentos/politicas.pdf documentos/catalogo.txt
 * Indexa (o re-indexa) uno o más documentos del negocio para RAG.
 */
async function main(): Promise<void> {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Uso: npm run rag:index -- <archivo1.pdf|.txt|.md> [archivo2 ...]");
    process.exit(1);
  }

  const rag = createRagIndex();
  for (const file of files) {
    await rag.indexDocument(file);
  }
}

main().catch((error) => {
  console.error("[rag:index] Error:", error);
  process.exit(1);
});
