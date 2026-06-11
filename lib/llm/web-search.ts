/**
 * Web search abstraction for the Strategist.
 *
 * The default backend is Gemini 2.0's native Google Search grounding tool,
 * which we ship with the existing GEMINI_API_KEY — no extra signup, real
 * Google results, citations included in the model response.
 *
 * Optionally, when `TAVILY_API_KEY` is set, an explicit Tavily call can be
 * used for raw multi-source snippet retrieval before synthesis (helpful for
 * a future "Deep dive" mode). For now this file just exposes the type +
 * the Tavily client so the orchestrator can compose them when wanted.
 */

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

/**
 * Best-effort Tavily search. Returns [] when the key is missing or the
 * request fails — callers should treat web search as additive context, not
 * a hard dependency.
 */
export async function tavilySearch(
  query: string,
  opts: { maxResults?: number; depth?: "basic" | "advanced" } = {},
): Promise<WebSearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: opts.depth ?? "basic",
        max_results: opts.maxResults ?? 5,
        include_answer: false,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{ title: string; url: string; content: string }>;
    };
    return (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    }));
  } catch {
    return [];
  }
}

/** Returns a short, citation-friendly label for a URL (just the bare host). */
export function shortDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 32);
  }
}

/** True when at least one web-search backend is configured. */
export function hasWebSearchKey(): boolean {
  // Gemini grounding is the default and uses GEMINI_API_KEY.
  return !!(
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.TAVILY_API_KEY
  );
}
