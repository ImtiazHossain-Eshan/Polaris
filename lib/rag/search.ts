import type { EmbeddedDoc, RagDoc } from "./types";
import { flattenAllDocs } from "./flatten";

let cachedEmbeddings: EmbeddedDoc[] | null = null;

async function loadEmbeddings(): Promise<EmbeddedDoc[] | null> {
  if (cachedEmbeddings) return cachedEmbeddings;
  try {
    // Runtime fs read so build doesn't fail if the file isn't there yet.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const p = path.join(process.cwd(), "data", "embeddings.json");
    const buf = await fs.readFile(p, "utf-8");
    const data = JSON.parse(buf) as EmbeddedDoc[];
    if (Array.isArray(data) && data.length > 0 && data[0].vector) {
      cachedEmbeddings = data;
      return cachedEmbeddings;
    }
    return null;
  } catch {
    return null;
  }
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Tiny keyword-overlap fallback used when no embeddings file is present.
// Lets the dev flow work without running `npm run embeddings`.
function keywordScore(query: string, doc: RagDoc): number {
  const q = new Set(
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  if (q.size === 0) return 0;
  const text = (doc.title + " " + doc.text).toLowerCase();
  let hits = 0;
  for (const w of q) if (text.includes(w)) hits++;
  return hits / q.size;
}

export type SearchHit = {
  id: string;
  title: string;
  source: RagDoc["source"];
  score: number;
  text: string;
  metadata: Record<string, unknown>;
};

export async function searchDocs(
  queryText: string,
  queryVector: number[] | null,
  topK = 6
): Promise<SearchHit[]> {
  const embeddings = await loadEmbeddings();

  if (embeddings && queryVector && queryVector.length > 0) {
    const scored = embeddings.map((d) => ({
      id: d.id,
      title: d.title,
      source: d.source,
      text: d.text,
      metadata: d.metadata,
      score: cosine(queryVector, d.vector),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // Fallback: keyword overlap over the flattened docs.
  const docs = flattenAllDocs();
  const scored = docs.map((d) => ({
    id: d.id,
    title: d.title,
    source: d.source,
    text: d.text,
    metadata: d.metadata,
    score: keywordScore(queryText, d),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
