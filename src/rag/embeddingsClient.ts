const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

/**
 * Cliente de embeddings. Usa siempre la API de OpenAI (`text-embedding-3-small`)
 * porque Anthropic no expone un endpoint de embeddings propio — esto aplica
 * incluso si `AI_PROVIDER=anthropic` para el chat, por lo que RAG requiere
 * `OPENAI_API_KEY` configurado en `.env` además del proveedor de chat elegido.
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RAG requiere OPENAI_API_KEY configurado (se usa para generar embeddings, " +
        "independientemente del AI_PROVIDER usado para el chat)."
    );
  }

  const model = process.env.EMBEDDINGS_MODEL || "text-embedding-3-small";

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI embeddings error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { data?: { embedding: number[]; index: number }[] };
  if (!data.data) throw new Error("OpenAI embeddings: respuesta sin datos");

  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
