/**
 * One-off script: embeds the curated KB with Gemini's text-embedding-004
 * and writes data/embeddings.json. Run with `npm run embeddings`.
 *
 * Requires GEMINI_API_KEY in env (or .env.local).
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { flattenAllDocs } from "../lib/rag/flatten";
import { embedText, hasGeminiKey } from "../lib/llm/gemini";

function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/i);
    if (m) process.env[m[1]] = m[2];
  }
}

async function main() {
  loadEnvLocal();
  if (!hasGeminiKey()) {
    console.error("Missing GEMINI_API_KEY. Create .env.local with GEMINI_API_KEY=…");
    process.exit(1);
  }

  const docs = flattenAllDocs();
  console.log(`Embedding ${docs.length} docs…`);

  const out: any[] = [];
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    try {
      const vector = await embedText(`${d.title}. ${d.text}`);
      if (!vector) throw new Error("no vector returned");
      out.push({ ...d, vector });
      process.stdout.write(`  ${i + 1}/${docs.length} ${d.id}\r`);
    } catch (e) {
      console.error(`\n  ! failed ${d.id}: ${(e as Error).message}`);
    }
    // Be polite to the free tier
    await new Promise((r) => setTimeout(r, 80));
  }

  const outPath = join(process.cwd(), "data", "embeddings.json");
  writeFileSync(outPath, JSON.stringify(out));
  console.log(`\nWrote ${out.length} embeddings → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
