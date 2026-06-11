"use client";

/**
 * MarkdownMessage — modern, dependency-free renderer for Strategist replies.
 *
 * Handles the formatting Gemini / Llama / GPT actually emit:
 *   • **bold**, *italic*, `inline code`, ~~strike~~
 *   • [link text](https://…)
 *   • # H1, ## H2, ### H3
 *   • - or * unordered lists, 1. ordered lists (with sub-indentation)
 *   • > blockquotes
 *   • ```language fenced code blocks
 *   • horizontal rules ---
 *   • <cite>label|uri</cite>  →  inline superscript footnote chip
 *     <cite>uri</cite>        →  ditto, inferring label from the URI
 *
 * Citation footnotes are clickable and link to the matching source chip
 * shown under the bubble (or open the URL for web sources).
 *
 * Designed for streaming: every render pass re-parses the in-progress text,
 * which is fine at typical reply sizes (<10KB).
 */

import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CitationSource = {
  /** Display label (e.g. "MIT Admissions"). */
  label: string;
  /** kb://id, roadmap://id, profile://id, or https://... */
  uri: string;
  /** Source kind decides styling. */
  kind: "kb" | "case" | "web" | "profile" | "roadmap";
};

type Props = {
  text: string;
  /** Sources already attached to this message; cite footnotes map into this list. */
  sources?: CitationSource[];
  /** Light or dark theme — controls colors. */
  theme?: "light" | "dark";
  className?: string;
};

/* ════════════════════════════════════════════════════════════════════════
   PUBLIC COMPONENT
   ════════════════════════════════════════════════════════════════════════ */

export function MarkdownMessage({ text, sources = [], theme = "light", className }: Props) {
  // 1. Pull <cite> tags out, replacing each with a unique sentinel so
  //    the inline markdown pass doesn't mangle them.
  const { sentinelText, citations } = useMemo(() => extractCitations(text), [text]);

  // 2. Build a lookup so we can render the citation as a numbered chip.
  const citationList = useMemo(() => buildCitationList(citations, sources), [citations, sources]);

  // 3. Parse the cleaned markdown into blocks → React.
  const nodes = useMemo(
    () => renderBlocks(sentinelText, citationList, theme),
    [sentinelText, citationList, theme],
  );

  return (
    <div className={cn(
      "markdown-body space-y-2.5 text-[14px] leading-relaxed",
      theme === "dark" ? "text-paper" : "text-ink",
      className,
    )}>
      {nodes}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   CITATION EXTRACTION
   ════════════════════════════════════════════════════════════════════════ */

type CitationToken = {
  /** Index into the rendered list (1-based for display). */
  n: number;
  /** Original label parsed from the tag, if any. */
  rawLabel?: string;
  /** Original URI parsed from the tag. */
  rawUri: string;
};

const CITE_RX = /<cite>([^<]+?)<\/cite>/g;
const SENTINEL_RX = /⁣CITE(\d+)⁣/g; // invisible char so it won't collide with content

function extractCitations(text: string): { sentinelText: string; citations: CitationToken[] } {
  const citations: CitationToken[] = [];
  let n = 0;
  const sentinelText = text.replace(CITE_RX, (_full, inner: string) => {
    const trimmed = inner.trim();
    // Two formats supported: "label|uri"  or  bare "uri"
    let rawLabel: string | undefined;
    let rawUri = trimmed;
    const pipeIdx = trimmed.indexOf("|");
    if (pipeIdx > -1) {
      rawLabel = trimmed.slice(0, pipeIdx).trim();
      rawUri = trimmed.slice(pipeIdx + 1).trim();
    }
    n += 1;
    citations.push({ n, rawLabel, rawUri });
    return `⁣CITE${n}⁣`;
  });
  return { sentinelText, citations };
}

/* ════════════════════════════════════════════════════════════════════════
   CITATION RESOLUTION
   ════════════════════════════════════════════════════════════════════════ */

type ResolvedCitation = {
  n: number;
  label: string;
  uri: string;
  kind: CitationSource["kind"];
};

function buildCitationList(
  tokens: CitationToken[],
  sources: CitationSource[],
): ResolvedCitation[] {
  return tokens.map((t) => {
    const kind = kindFromUri(t.rawUri);
    // Try to map to one of the attached sources (matches by URI prefix or by label).
    const fromSources =
      sources.find((s) => s.uri === t.rawUri) ??
      (t.rawLabel ? sources.find((s) => s.label === t.rawLabel) : undefined);
    return {
      n: t.n,
      label: fromSources?.label ?? t.rawLabel ?? prettyLabelFromUri(t.rawUri),
      uri: fromSources?.uri ?? t.rawUri,
      kind: fromSources?.kind ?? kind,
    };
  });
}

function kindFromUri(uri: string): CitationSource["kind"] {
  if (uri.startsWith("kb://")) return "kb";
  if (uri.startsWith("case://")) return "case";
  if (uri.startsWith("profile://")) return "profile";
  if (uri.startsWith("roadmap://")) return "roadmap";
  return "web";
}

function prettyLabelFromUri(uri: string): string {
  if (uri.startsWith("roadmap://")) return `Milestone ${uri.slice("roadmap://".length)}`;
  if (uri.startsWith("kb://")) return uri.slice("kb://".length);
  if (uri.startsWith("profile://")) return "Your profile";
  if (uri.startsWith("case://")) return uri.slice("case://".length);
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return uri.slice(0, 32);
  }
}

/* ════════════════════════════════════════════════════════════════════════
   BLOCK PARSER
   ════════════════════════════════════════════════════════════════════════ */

type Theme = "light" | "dark";

function renderBlocks(text: string, citations: ResolvedCitation[], theme: Theme): ReactNode[] {
  // Normalize line endings + strip leading/trailing blank lines per block.
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ─── Fenced code block ───
    const fenceMatch = /^```(\w+)?\s*$/.exec(line);
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? "";
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // consume closing fence
      blocks.push({ type: "code", lang, content: code.join("\n") });
      continue;
    }

    // ─── Horizontal rule ───
    if (/^\s*(\*\s*){3,}\s*$/.test(line) || /^\s*(-\s*){3,}\s*$/.test(line) || /^\s*(_\s*){3,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    // ─── Heading ───
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, content: heading[2].trim() });
      i += 1;
      continue;
    }

    // ─── Blockquote ───
    if (/^\s*>\s/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", content: quote.join("\n") });
      continue;
    }

    // ─── Lists (unordered / ordered, with simple nesting) ───
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const { list, consumed } = collectList(lines, i);
      blocks.push(list);
      i += consumed;
      continue;
    }

    // ─── Blank line ───
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // ─── Paragraph (consume until blank/structure) ───
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s/.test(lines[i]) &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
      !/^\s*>\s/.test(lines[i]) &&
      !/^```/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", content: para.join(" ") });
  }

  return blocks.map((b, idx) => renderBlock(b, idx, citations, theme));
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "paragraph"; content: string }
  | { type: "quote"; content: string }
  | { type: "code"; lang: string; content: string }
  | { type: "hr" }
  | { type: "list"; ordered: boolean; items: ListItem[] };

type ListItem = {
  content: string;
  children?: Block[];
};

/** Walks a contiguous list block, including nested lists indented by ≥2 spaces. */
function collectList(lines: string[], start: number): { list: Block & { type: "list" }; consumed: number } {
  const startLine = lines[start];
  const orderedFirst = /^\s*\d+\.\s+/.test(startLine);
  const baseIndentMatch = /^(\s*)/.exec(startLine);
  const baseIndent = baseIndentMatch ? baseIndentMatch[1].length : 0;

  const items: ListItem[] = [];
  let i = start;
  let currentLines: string[] | null = null;
  let nestedLines: string[] = [];

  const flush = () => {
    if (currentLines === null) return;
    const head = currentLines.join(" ").trim();
    const children = nestedLines.length
      ? renderBlocksToBlocks(nestedLines.join("\n"))
      : undefined;
    items.push({ content: head, children });
    currentLines = null;
    nestedLines = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const indentMatch = /^(\s*)/.exec(line);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const isItemStart = /^\s*([-*+]|\d+\.)\s+/.test(line) && indent === baseIndent;
    const isNested =
      currentLines !== null &&
      line.trim().length > 0 &&
      indent > baseIndent;
    const isBlank = !line.trim();

    if (isItemStart) {
      flush();
      const stripped = line.replace(/^\s*([-*+]|\d+\.)\s+/, "");
      currentLines = [stripped];
      i += 1;
      continue;
    }
    if (isNested) {
      nestedLines.push(line.slice(baseIndent + 2));
      i += 1;
      continue;
    }
    if (currentLines !== null && !isBlank && indent >= baseIndent) {
      // Continuation of the same item.
      currentLines.push(line.trim());
      i += 1;
      continue;
    }
    if (isBlank) {
      // A single blank line is allowed between items; two ends the list.
      if (i + 1 < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i + 1])) {
        i += 1;
        continue;
      }
      break;
    }
    break;
  }
  flush();
  return {
    list: { type: "list", ordered: orderedFirst, items },
    consumed: i - start,
  };
}

/** Re-runs the block parser on a sub-string (for nested list children). */
function renderBlocksToBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const { list, consumed } = collectList(lines, i);
      blocks.push(list);
      i += consumed;
      continue;
    }
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", content: para.join(" ") });
  }
  return blocks;
}

/* ════════════════════════════════════════════════════════════════════════
   BLOCK → REACT
   ════════════════════════════════════════════════════════════════════════ */

function renderBlock(b: Block, key: number, citations: ResolvedCitation[], theme: Theme): ReactNode {
  switch (b.type) {
    case "hr":
      return <hr key={key} className={cn("my-3 border-0 h-px", theme === "dark" ? "bg-white/10" : "bg-polaris-500/15")}/>;

    case "heading": {
      const cls = b.level === 1
        ? "text-[19px] font-bold tracking-tight font-serif"
        : b.level === 2
          ? "text-[16px] font-bold tracking-tight"
          : "text-[14.5px] font-semibold tracking-tight";
      const Tag = b.level === 1 ? "h2" : b.level === 2 ? "h3" : "h4";
      return (
        <Tag key={key} className={cn("mt-3 first:mt-0 mb-1.5", cls)}>
          {renderInline(b.content, citations, theme)}
        </Tag>
      );
    }

    case "paragraph":
      return (
        <p key={key} className="leading-relaxed">
          {renderInline(b.content, citations, theme)}
        </p>
      );

    case "quote":
      return (
        <blockquote
          key={key}
          className={cn(
            "border-l-2 pl-3 py-0.5 italic text-[13.5px]",
            theme === "dark"
              ? "border-polaris-400/40 text-paper/80 bg-white/[0.02]"
              : "border-polaris-500/30 text-ink-dim bg-paper-soft/40",
          )}
        >
          {renderInline(b.content, citations, theme)}
        </blockquote>
      );

    case "code":
      return (
        <pre
          key={key}
          className={cn(
            "overflow-x-auto rounded-lg p-3 text-[12.5px] font-mono leading-relaxed",
            theme === "dark"
              ? "bg-white/[0.06] ring-1 ring-inset ring-white/[0.08] text-paper"
              : "bg-paper-soft hairline text-ink",
          )}
        >
          {b.lang && (
            <div className={cn("text-[10px] uppercase tracking-wider mb-1.5", theme === "dark" ? "text-paper/45" : "text-ink-muted")}>
              {b.lang}
            </div>
          )}
          <code>{b.content}</code>
        </pre>
      );

    case "list":
      return renderList(b, key, citations, theme);
  }
}

function renderList(
  list: Block & { type: "list" },
  key: number,
  citations: ResolvedCitation[],
  theme: Theme,
): ReactNode {
  if (list.ordered) {
    return (
      <ol key={key} className="space-y-1.5 ml-5 list-decimal marker:text-polaris-500 marker:font-semibold">
        {list.items.map((item, i) => (
          <li key={i} className="pl-1.5 leading-relaxed">
            <span>{renderInline(item.content, citations, theme)}</span>
            {item.children && (
              <div className="mt-1.5 ml-1">
                {item.children.map((c, ci) => renderBlock(c, ci, citations, theme))}
              </div>
            )}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul key={key} className="space-y-1.5 ml-1">
      {list.items.map((item, i) => (
        <li key={i} className="flex gap-2 leading-relaxed">
          <span className={cn("mt-[7px] h-1.5 w-1.5 rounded-full shrink-0", theme === "dark" ? "bg-polaris-300" : "bg-polaris-500")}/>
          <div className="min-w-0 flex-1">
            <div>{renderInline(item.content, citations, theme)}</div>
            {item.children && (
              <div className="mt-1.5">
                {item.children.map((c, ci) => renderBlock(c, ci, citations, theme))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   INLINE PARSER
   ════════════════════════════════════════════════════════════════════════ */

function renderInline(
  text: string,
  citations: ResolvedCitation[],
  theme: Theme,
): ReactNode[] {
  if (!text) return [];

  // First, split on citation sentinels so we can drop the chips in cleanly.
  const parts: Array<string | { cite: ResolvedCitation }> = [];
  let last = 0;
  SENTINEL_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SENTINEL_RX.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const n = parseInt(m[1], 10);
    const cite = citations.find((c) => c.n === n);
    if (cite) parts.push({ cite });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  // Then run each text part through the inline markdown tokenizer.
  const out: ReactNode[] = [];
  for (let pi = 0; pi < parts.length; pi += 1) {
    const p = parts[pi];
    if (typeof p === "string") {
      out.push(...tokenizeInline(p, theme).map((node, ti) => <span key={`${pi}-${ti}`}>{node}</span>));
    } else {
      out.push(<CitationChip key={`cite-${p.cite.n}`} cite={p.cite} theme={theme} />);
    }
  }
  return out;
}

function tokenizeInline(text: string, theme: Theme): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Markdown inline tokens, ordered by precedence.
  // We process them by repeatedly slicing at the next match.
  const RX = /(\*\*([^*]+?)\*\*|__([^_]+?)__|\*([^*]+?)\*|_([^_]+?)_|~~([^~]+?)~~|`([^`]+?)`|\[([^\]]+?)\]\(([^)]+?)\))/;

  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const match = RX.exec(remaining);
    if (!match) {
      nodes.push(<span key={key++}>{linkifyBareUrls(remaining)}</span>);
      break;
    }
    if (match.index > 0) {
      nodes.push(<span key={key++}>{linkifyBareUrls(remaining.slice(0, match.index))}</span>);
    }
    const [whole, , bold1, bold2, italic1, italic2, strike, code, linkText, linkUrl] = match;

    if (bold1 ?? bold2) {
      nodes.push(<strong key={key++} className="font-semibold">{bold1 ?? bold2}</strong>);
    } else if (italic1 ?? italic2) {
      nodes.push(<em key={key++} className="italic">{italic1 ?? italic2}</em>);
    } else if (strike) {
      nodes.push(<s key={key++} className="opacity-70">{strike}</s>);
    } else if (code) {
      nodes.push(
        <code
          key={key++}
          className={cn(
            "px-1 py-0.5 rounded font-mono text-[12.5px]",
            theme === "dark"
              ? "bg-white/[0.08] text-polaris-200"
              : "bg-polaris-50 text-polaris-700",
          )}
        >
          {code}
        </code>,
      );
    } else if (linkText && linkUrl) {
      nodes.push(
        <a
          key={key++}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "underline underline-offset-2 transition-colors",
            theme === "dark"
              ? "text-polaris-200 hover:text-polaris-100"
              : "text-polaris-600 hover:text-polaris-700",
          )}
        >
          {linkText}
        </a>,
      );
    }

    remaining = remaining.slice(match.index + whole.length);
  }
  return nodes;
}

/** Cheaply linkify bare http(s) URLs that weren't already wrapped in [](). */
function linkifyBareUrls(text: string): ReactNode {
  if (!/https?:\/\//.test(text)) return text;
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return parts.map((p, i) => {
    if (/^https?:\/\//.test(p)) {
      return (
        <a
          key={i}
          href={p}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 text-polaris-600 hover:text-polaris-700"
        >
          {p.length > 48 ? p.slice(0, 48) + "…" : p}
        </a>
      );
    }
    return p;
  });
}

/* ════════════════════════════════════════════════════════════════════════
   CITATION CHIP
   ════════════════════════════════════════════════════════════════════════ */

function CitationChip({ cite, theme }: { cite: ResolvedCitation; theme: Theme }) {
  const tone =
    cite.kind === "web"      ? "polaris" :
    cite.kind === "kb"       ? "aurora"  :
    cite.kind === "roadmap"  ? "nova"    :
    cite.kind === "case"     ? "aurora"  :
                               "ink";

  const cls = theme === "dark"
    ? cn(
        "inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-md font-mono text-[10px] font-semibold align-middle mx-0.5 transition-colors ring-1 ring-inset",
        tone === "polaris" && "bg-polaris-500/15 text-polaris-200 ring-polaris-400/30 hover:bg-polaris-500/25",
        tone === "aurora"  && "bg-aurora-500/15 text-aurora-300 ring-aurora-400/30 hover:bg-aurora-500/25",
        tone === "nova"    && "bg-nova-500/15 text-nova-300 ring-nova-400/30 hover:bg-nova-500/25",
        tone === "ink"     && "bg-white/[0.06] text-paper/75 ring-white/[0.10] hover:bg-white/[0.10]",
      )
    : cn(
        "inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-md font-mono text-[10px] font-semibold align-middle mx-0.5 transition-colors ring-1 ring-inset",
        tone === "polaris" && "bg-polaris-100 text-polaris-700 ring-polaris-300/50 hover:bg-polaris-200",
        tone === "aurora"  && "bg-aurora-100 text-aurora-700 ring-aurora-400/40 hover:bg-aurora-200",
        tone === "nova"    && "bg-nova-100 text-nova-700 ring-nova-400/40 hover:bg-nova-200",
        tone === "ink"     && "bg-paper-soft text-ink-dim ring-polaris-500/15 hover:bg-paper",
      );

  if (cite.kind === "web" && /^https?:/.test(cite.uri)) {
    return (
      <a href={cite.uri} target="_blank" rel="noopener noreferrer" className={cls} title={`${cite.label} — ${cite.uri}`}>
        {cite.n}
      </a>
    );
  }
  return <span className={cls} title={`${cite.label} — ${cite.uri}`}>{cite.n}</span>;
}
