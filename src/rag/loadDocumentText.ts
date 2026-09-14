import fs from "node:fs/promises";
import path from "node:path";
// Import estático (no dynamic import()): pdf-parse@1.x detecta si se
// ejecuta "standalone" mirando module.parent, y un import() dinámico lo
// deja sin padre y dispara un modo debug que intenta leer un PDF de
// prueba fijo. Con require()/import estático esto no ocurre.
import pdfParse from "pdf-parse";

/**
 * Extrae el texto plano de un documento del cliente para indexarlo.
 * Soporta .txt/.md directamente y .pdf vía `pdf-parse`.
 */
export async function loadDocumentText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === ".txt" || ext === ".md") {
    return fs.readFile(filePath, "utf-8");
  }

  throw new Error(
    `Formato no soportado para RAG: "${ext}". Usa .txt, .md o .pdf (archivo: ${filePath})`
  );
}
