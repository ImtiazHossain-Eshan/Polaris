"use client";

/**
 * Full-page Strategist (AgentView).
 *
 * Replaces the previous duplicate-of-the-right-rail layout. On /strategist
 * THIS is the only chat surface — the right-rail AgentChat hides itself
 * when the route is /strategist (see AgentChat.tsx).
 *
 * Feature parity with the right-rail chat:
 *   • Multi-provider model picker (Auto + Gemini/Groq/OpenRouter/Together/
 *     Ollama/OpenAI grouped, with Free/Local/Paid tags, legacy-collapsed).
 *   • Mode pills (General / Research / Study / Coding).
 *   • Web-search thinking indicator.
 *   • Web sources rendered as clickable chips.
 *   • Routing reason shown post-stream.
 *   • Real /api/strategist SSE — same backend as the right rail.
 *
 * Layout:
 *   ┌──── chat canvas ────────┬── context strip ──┐
 *   │  hero + chat            │ student card      │
 *   │                         │ gap engine        │
 *   │                         │ tools             │
 *   └─────────────────────────┴───────────────────┘
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StrategistChunk } from "@/lib/strategist/schemas";
import { Card, Pill, Tag, Avatar, Icon } from "./ui";
import { QuotaModal, resetHintFrom, type QuotaState } from "./QuotaModal";
import { roadmapStore, strategistContextPayload } from "@/lib/roadmap/store";
import { MarkdownMessage, type CitationSource } from "./MarkdownMessage";
import { ChatHistoryRail } from "./ChatHistoryRail";
import { CompactModelPicker, type CmpRouteMode } from "./CompactModelPicker";
import { cn } from "@/lib/cn";

type Tier = "free" | "paid" | "local";
type Mode = "general" | "research" | "study" | "coding";

type ProviderInfo = {
  id: string;
  name: string;
  defaultTier: Tier;
  configured: boolean;
  models: Array<{ id: string; label: string; tier: Tier; legacy?: boolean }>;
};

type ModelChoice = { providerId: string; modelId: string } | "auto";

type WebSource = { label: string; uri: string; kind: "kb" | "case" | "web" | "profile" | "roadmap" };
type Msg = {
  id: string;
  role: "user" | "agent";
  text: string;
  sources: WebSource[];
  gap?: boolean;
};

export type GapRow = { signal: string; you: string; admit: string; move: string };
type CtxRow = { k: string; v: string };

const SUGGESTIONS = [
  "Plan my week",
  "Why is my probability where it is?",
  "What am I missing vs. admits?",
  "Re-run my probability",
  "Find a recommender outside school",
];

const MODES: Array<{ id: Mode; label: string; desc: string }> = [
  { id: "general",  label: "General",  desc: "Balanced co-pilot" },
  { id: "research", label: "Research", desc: "Deep web research" },
  { id: "study",    label: "Study",    desc: "Step-by-step explainer" },
  { id: "coding",   label: "Coding",   desc: "Code-first" },
];

const MODEL_KEY = "polaris.strategist.model";
const MODE_KEY = "polaris.strategist.mode";
const PAID_KEY = "polaris.strategist.allowPaid";
const OFFLINE_KEY = "polaris.strategist.offline";
const ROUTE_MODE_KEY = "polaris.strategist.routeMode";
/** Shared with the right-rail AgentChat — both surfaces use one thread. */
const ACTIVE_THREAD_KEY = "polaris.chat.activeThread";
/** One-shot draft handoff (e.g. "Ask Strategist for help" on a weekly task). */
const DRAFT_KEY = "polaris.strategist.draft";

export function StrategistClient({
  studentName, initials, grade, contextRows, gapRows, eyebrow,
}: {
  studentName: string;
  initials: string;
  grade: string;
  contextRows: CtxRow[];
  gapRows: GapRow[];
  eyebrow: string;
}) {
  /* ─── core chat state ─── */
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "seed",
      role: "agent",
      text: `I'm grounded in your profile, your roadmap, your saved memories, and the live web. Here's how your profile compares to admits — ask me to turn any gap into a plan.`,
      sources: [],
      gap: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ provider: string; model: string; reason: string } | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  /* ─── provider + mode state ─── */
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [model, setModel] = useState<ModelChoice>("auto");
  const [mode, setMode] = useState<Mode>("general");
  const [routeMode, setRouteMode] = useState<CmpRouteMode>("balanced");
  const [allowPaid, setAllowPaid] = useState(false);
  const [offline, setOffline] = useState(false);
  // Guards the server write-through: skip until the saved pref has loaded.
  const prefLoadedRef = useRef(false);

  /* ─── Responsive breakpoint (drives the grid template) ─── */
  const [bp, setBp] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [mobileChatsOpen, setMobileChatsOpen] = useState(false);
  useEffect(() => {
    const mdQ = window.matchMedia("(min-width: 768px)");
    const xlQ = window.matchMedia("(min-width: 1280px)");
    const update = () => setBp(xlQ.matches ? "desktop" : mdQ.matches ? "tablet" : "mobile");
    update();
    mdQ.addEventListener("change", update);
    xlQ.addEventListener("change", update);
    return () => { mdQ.removeEventListener("change", update); xlQ.removeEventListener("change", update); };
  }, []);

  /* ─── Chat history state ─── */
  const [threadId, setThreadId] = useState<string | null>(null);

  // Restore the thread shared with the right-rail chat, and pick up any
  // one-shot draft handed off from a weekly task ("Ask Strategist for help").
  useEffect(() => {
    try {
      const tid = localStorage.getItem(ACTIVE_THREAD_KEY);
      if (tid) setThreadId(tid);
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        setInput(draft);
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch { /* ignore */ }
  }, []);

  // Keep the shared key in sync so the right-rail picks up this conversation.
  useEffect(() => {
    try {
      if (threadId) localStorage.setItem(ACTIVE_THREAD_KEY, threadId);
      else localStorage.removeItem(ACTIVE_THREAD_KEY);
    } catch { /* ignore */ }
  }, [threadId]);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [threadsReloadKey, setThreadsReloadKey] = useState(0);
  const [railWidth, setRailWidth] = useState(260);
  const [resizingRail, setResizingRail] = useState(false);

  // Hydrate the persisted rail width / collapsed state.
  useEffect(() => {
    try {
      const w = parseInt(localStorage.getItem("polaris.chatRail.width") ?? "", 10);
      if (Number.isFinite(w) && w >= 100 && w <= 600) setRailWidth(w);
      const c = localStorage.getItem("polaris.chatRail.collapsed");
      if (c === "true") setRailCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  // Clamp + persist on every width change.
  const setRailWidthClamped = useCallback((px: number) => {
    // Below 140px → snap to collapsed.
    if (px < 140) {
      setRailCollapsed(true);
      try { localStorage.setItem("polaris.chatRail.collapsed", "true"); } catch { /* ignore */ }
      return;
    }
    const next = Math.max(180, Math.min(560, px));
    setRailCollapsed(false);
    setRailWidth(next);
    try {
      localStorage.setItem("polaris.chatRail.collapsed", "false");
      localStorage.setItem("polaris.chatRail.width", String(next));
    } catch { /* ignore */ }
  }, []);

  function toggleRailCollapsed() {
    const next = !railCollapsed;
    setRailCollapsed(next);
    try { localStorage.setItem("polaris.chatRail.collapsed", String(next)); } catch { /* ignore */ }
  }

  // Hydrate persisted picker state (shared with right-rail): localStorage
  // first for instant boot, then the server-saved preference wins.
  useEffect(() => {
    try {
      const m = localStorage.getItem(MODEL_KEY);
      if (m === "auto" || m === null) setModel("auto");
      else setModel(JSON.parse(m) as ModelChoice);
      const md = localStorage.getItem(MODE_KEY) as Mode | null;
      if (md && MODES.some((x) => x.id === md)) setMode(md);
      const rm = localStorage.getItem(ROUTE_MODE_KEY) as CmpRouteMode | null;
      if (rm && ["fast", "balanced", "advanced", "reasoning"].includes(rm)) setRouteMode(rm);
      setAllowPaid(localStorage.getItem(PAID_KEY) === "true");
      setOffline(localStorage.getItem(OFFLINE_KEY) === "true");
    } catch { /* ignore */ }

    let cancelled = false;
    fetch("/api/account/model-pref", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const pref = d?.pref;
        if (pref) {
          setModel(pref.choice === "auto" ? "auto" : (pref.choice as ModelChoice));
          setRouteMode(pref.mode as CmpRouteMode);
          setAllowPaid(!!pref.allowPaid);
          setOffline(!!pref.offline);
        }
      })
      .catch(() => { /* local state stands */ })
      .finally(() => { if (!cancelled) prefLoadedRef.current = true; });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { localStorage.setItem(MODEL_KEY, model === "auto" ? "auto" : JSON.stringify(model)); }, [model]);
  useEffect(() => { localStorage.setItem(MODE_KEY, mode); }, [mode]);
  useEffect(() => { localStorage.setItem(ROUTE_MODE_KEY, routeMode); }, [routeMode]);
  useEffect(() => { localStorage.setItem(PAID_KEY, String(allowPaid)); }, [allowPaid]);
  useEffect(() => { localStorage.setItem(OFFLINE_KEY, String(offline)); }, [offline]);

  // Debounced write-through to the server-saved preference.
  useEffect(() => {
    if (!prefLoadedRef.current) return;
    const t = setTimeout(() => {
      void fetch("/api/account/model-pref", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          choice: model === "auto" ? "auto" : model,
          mode: routeMode,
          allowPaid,
          offline,
        }),
      }).catch(() => { /* best-effort */ });
    }, 600);
    return () => clearTimeout(t);
  }, [model, routeMode, allowPaid, offline]);

  // Fetch available providers — re-probes Ollama when reprobeOllama is set.
  const refreshProviders = useCallback(async (opts: { reprobeOllama?: boolean } = {}) => {
    try {
      if (opts.reprobeOllama) {
        await fetch("/api/providers/ollama", { method: "DELETE" }).catch(() => null);
      }
      const r = await fetch("/api/providers", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      if (data?.providers) setProviders(data.providers as ProviderInfo[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void refreshProviders(); }, [refreshProviders]);

  const availableModels = useMemo(() => {
    const out: Array<{ providerId: string; providerName: string; modelId: string; modelLabel: string; tier: Tier; legacy: boolean }> = [];
    for (const p of providers) {
      if (!p.configured) continue;
      for (const m of p.models) {
        if (offline && m.tier !== "local") continue;
        if (!allowPaid && m.tier === "paid") continue;
        out.push({
          providerId: p.id,
          providerName: p.name,
          modelId: m.id,
          modelLabel: m.label,
          tier: m.tier,
          legacy: !!m.legacy,
        });
      }
    }
    return out;
  }, [providers, offline, allowPaid]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, streaming]);

  /* ─── Thread persistence ─── */

  // Load messages when threadId changes.
  useEffect(() => {
    if (!threadId) {
      // Fresh session — reset to seed.
      setMessages([{
        id: "seed",
        role: "agent",
        text: `I'm grounded in your profile, your roadmap, your saved memories, and the live web. Here's how your profile compares to admits — ask me to turn any gap into a plan.`,
        sources: [],
        gap: true,
      }]);
      return;
    }
    let cancelled = false;
    fetch(`/api/chat/threads/${threadId}/messages`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.messages) return;
        const loaded: Msg[] = d.messages.map((m: { id: string; role: "user" | "assistant"; text: string; sources?: WebSource[] }) => ({
          id: m.id,
          role: m.role === "user" ? "user" : "agent",
          text: m.text,
          sources: m.sources ?? [],
        }));
        setMessages(loaded.length ? loaded : [{
          id: "seed", role: "agent", text: "Loaded an empty conversation. Ask me anything.", sources: [],
        }]);
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [threadId]);

  // Create or reuse a thread for the current send.
  const ensureThread = useCallback(async (firstUserText: string): Promise<string | null> => {
    if (threadId) return threadId;
    try {
      const title = firstUserText.length > 60 ? firstUserText.slice(0, 57) + "…" : firstUserText;
      const res = await fetch("/api/chat/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) return null;
      const d = await res.json();
      const id = d?.thread?.id as string | undefined;
      if (id) {
        setThreadId(id);
        setThreadsReloadKey((k) => k + 1);
        return id;
      }
    } catch { /* swallow */ }
    return null;
  }, [threadId]);

  // Persist a user or assistant message.
  const persistMessage = useCallback(async (
    tid: string,
    role: "user" | "assistant",
    text: string,
    extras: Partial<{ sources: WebSource[]; providerId: string; modelId: string; mode: Mode }> = {},
  ) => {
    try {
      await fetch(`/api/chat/threads/${tid}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, text, ...extras }),
      });
      setThreadsReloadKey((k) => k + 1);
    } catch { /* best-effort */ }
  }, []);

  function startNewChat() {
    setThreadId(null);
    setMessages([{
      id: "seed",
      role: "agent",
      text: `I'm grounded in your profile, your roadmap, your saved memories, and the live web. Here's how your profile compares to admits — ask me to turn any gap into a plan.`,
      sources: [],
      gap: true,
    }]);
  }

  // Suppress the layout's <main> scroll so wheel events land on the inner
  // messages scroller. Revert on unmount so other pages still scroll.
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const prevOverflow = main.style.overflow;
    const prevHeight = main.style.height;
    main.style.overflow = "hidden";
    main.style.height = "100%";
    return () => {
      main.style.overflow = prevOverflow;
      main.style.height = prevHeight;
    };
  }, []);

  // Forward wheel events from the hero / non-scrollable areas of the chat
  // column into the messages scroller, so the wheel works anywhere over the
  // middle column — not only when hovering the messages themselves.
  const chatColRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const col = chatColRef.current;
    const scroll = scroller.current;
    if (!col || !scroll) return;
    function onWheel(e: WheelEvent) {
      if (!scroll) return;
      if (e.target instanceof Node && scroll.contains(e.target)) return; // native
      e.preventDefault();
      scroll.scrollBy({ top: e.deltaY, behavior: "auto" });
    }
    col.addEventListener("wheel", onWheel, { passive: false });
    return () => col.removeEventListener("wheel", onWheel);
  }, []);

  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || streaming) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text, sources: [] };
    const placeholder: Msg = { id: crypto.randomUUID(), role: "agent", text: "", sources: [] };
    setMessages((m) => [...m, userMsg, placeholder]);
    setInput("");
    setStreaming(true);
    setThinking(null);
    setRouteInfo(null);

    // Ensure a thread exists + persist the user turn (fire-and-forget).
    const tid = await ensureThread(text);
    if (tid) void persistMessage(tid, "user", text, { mode });

    try {
      const body: Record<string, unknown> = { message: text, mode, routeMode, offline, allowPaid };
      // Live roadmap context: focused node + recent roadmap events.
      body.roadmapContext = strategistContextPayload(roadmapStore.get());
      if (model === "auto") body.autoSelect = true;
      else body.model = { providerId: model.providerId, modelId: model.modelId };

      const res = await fetch("/api/strategist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const rem = res.headers.get("X-RateLimit-Remaining");
      if (rem !== null) setRemaining(parseInt(rem, 10));
      if (res.status === 429) {
        setMessages((m) => m.slice(0, -1));
        setQuota({ kind: "plan", resetHint: resetHintFrom(res.headers.get("X-RateLimit-Reset")) });
        return;
      }
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "The Strategist is unavailable right now.");
        setMessages((m) => patchLast(m, (msg) => ({ ...msg, text: err })));
        return;
      }

      await consumeSse(res.body.getReader(), (chunk) => {
        if (chunk.kind === "error" && chunk.code === "AI_QUOTA") {
          setQuota({ kind: "ai" });
          setMessages((m) => m.slice(0, -1));
          setThinking(null);
          return;
        }
        if (chunk.kind === "tool") {
          if (chunk.name === "model_route" && chunk.status === "done") {
            const r = chunk.result as { providerName?: string; modelLabel?: string; reason?: string } | undefined;
            if (r?.providerName && r?.modelLabel) {
              setRouteInfo({ provider: r.providerName, model: r.modelLabel, reason: r.reason ?? "" });
              setThinking(`Using ${r.modelLabel}…`);
            }
            return;
          }
          if (chunk.status === "start" && chunk.name === "web_search") {
            setThinking("Searching the web…");
          } else if (chunk.status === "done" && chunk.name === "web_search") {
            const r = chunk.result as { sources?: number } | undefined;
            setThinking(
              r?.sources
                ? `Read ${r.sources} source${r.sources === 1 ? "" : "s"} — synthesizing…`
                : null,
            );
          } else if (chunk.status === "error") {
            setThinking(null);
          }
          return;
        }
        if (chunk.kind === "done") setThinking(null);
        setMessages((m) => {
          const last = m[m.length - 1];
          if (!last || last.role !== "agent") return m;
          if (chunk.kind === "text") {
            if (!last.text) setThinking(null);
            return [...m.slice(0, -1), { ...last, text: last.text + chunk.delta }];
          }
          if (chunk.kind === "source") {
            const src: WebSource = { label: chunk.label, uri: chunk.uri, kind: chunk.source };
            return [...m.slice(0, -1), { ...last, sources: [...last.sources, src] }];
          }
          if (chunk.kind === "error") {
            return [...m.slice(0, -1), { ...last, text: chunk.message }];
          }
          return m;
        });
      });
    } catch {
      setMessages((m) => patchLast(m, (msg) => ({ ...msg, text: "The Strategist disconnected. Try a suggestion to retry." })));
    } finally {
      setStreaming(false);
      setThinking(null);
      // Persist the assistant turn on completion (fire-and-forget).
      if (tid) {
        // Read the latest assistant message using a flushSync-free state read.
        setMessages((m) => {
          const last = m[m.length - 1];
          if (last && last.role === "agent" && last.text.length > 0) {
            void persistMessage(tid, "assistant", last.text, {
              sources: last.sources,
              mode,
              providerId: routeInfo?.provider,
              modelId: routeInfo?.model,
            });
          }
          return m;
        });
      }
    }
  }, [input, streaming, mode, model, routeMode, offline, allowPaid, routeInfo, ensureThread, persistMessage]);

  // A real exchange exists (not just the seed greeting) → collapse the hero.
  const hasConversation = messages.some((m) => m.role === "user");

  const railCol = railCollapsed ? "48px" : `${railWidth}px`;
  const gridCols =
    bp === "mobile" ? "1fr" :
    bp === "tablet" ? `${railCol} 1fr` :
    `${railCol} 1fr 320px`;

  return (
    <div
      className={cn(
        "h-full min-h-0 grid overflow-hidden",
        // Smooth grid-template transition only when not actively dragging.
        !resizingRail && "transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
      )}
      style={{ gridTemplateColumns: gridCols }}
    >
      {/* ─── Chat history rail — grid column (md+) or overlay drawer (mobile) ─── */}
      {bp !== "mobile" ? (
        <ChatHistoryRail
          activeId={threadId}
          onSelect={(id) => setThreadId(id)}
          onNew={startNewChat}
          collapsed={railCollapsed}
          onToggleCollapse={toggleRailCollapsed}
          reloadKey={threadsReloadKey}
          width={railWidth}
          onResize={setRailWidthClamped}
          resizing={resizingRail}
          onResizeStart={() => setResizingRail(true)}
          onResizeEnd={() => setResizingRail(false)}
        />
      ) : (
        <>
          {mobileChatsOpen && (
            <button
              aria-label="Close conversations"
              onClick={() => setMobileChatsOpen(false)}
              className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm"
            />
          )}
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              mobileChatsOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <ChatHistoryRail
              activeId={threadId}
              onSelect={(id) => { setThreadId(id); setMobileChatsOpen(false); }}
              onNew={() => { startNewChat(); setMobileChatsOpen(false); }}
              collapsed={false}
              onToggleCollapse={() => setMobileChatsOpen(false)}
              reloadKey={threadsReloadKey}
              width={Math.min(railWidth, 320)}
              onResize={() => {}}
              resizing={false}
              onResizeStart={() => {}}
              onResizeEnd={() => {}}
            />
          </div>
        </>
      )}

      {/* ─── Main chat column ───
          min-h-0 is critical: grid children default to min-height:auto and
          would grow past the row, leaving the inner scroller unconstrained
          (= content clipped by the grid's overflow-hidden, wheel dead). */}
      <div ref={chatColRef} className="flex flex-col bg-paper min-w-0 min-h-0">
        {/* Hero — full only while the conversation is fresh; collapses to a
            slim strip once the user starts chatting so messages get the room. */}
        <div className={cn(
          "px-4 sm:px-6 lg:px-10 border-b border-polaris-500/10 bg-gradient-to-b from-paper-soft/40 to-paper",
          hasConversation ? "pt-3 pb-3" : "pt-5 lg:pt-8 pb-4",
        )}>
          <div className={cn("flex items-center gap-2", hasConversation ? "mb-0" : "mb-2")}>
            {bp === "mobile" && (
              <button
                onClick={() => setMobileChatsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-paper-card hairline px-3 py-1.5 text-[11.5px] font-medium text-ink-dim hover:text-ink transition-colors shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a8.5 8.5 0 1 1-3.4-6.8L21 4l-1.2 3.6A8.5 8.5 0 0 1 21 12z"/></svg>
                Chats
              </button>
            )}
            {hasConversation ? (
              <span className="font-serif text-[15px] font-bold tracking-tight text-ink truncate">Strategist</span>
            ) : (
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-muted font-medium">{eyebrow}</div>
            )}
          </div>
          {!hasConversation && (
            <>
              <h1 className="font-serif text-[22px] sm:text-[26px] lg:text-[30px] leading-tight font-bold tracking-tight text-ink">
                Your <span className="grad-text">long-horizon</span> AI academic strategist.
              </h1>
              <p className="hidden sm:block text-[13px] text-ink-dim mt-2 max-w-2xl leading-relaxed">
                Grounded in global admit patterns, your profile, your notes, your saved memories, and the live web.
                Every answer cites its sources and proposes the next concrete action.
              </p>
            </>
          )}

          {/* Mode + model picker row */}
          <div className={cn("flex flex-col sm:flex-row sm:items-center gap-3 max-w-3xl", hasConversation ? "mt-2" : "mt-5")}>
            <div className="flex items-center gap-1.5">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  title={m.desc}
                  className={cn(
                    "text-[11.5px] font-medium px-2.5 py-1 rounded-full ring-1 ring-inset transition-colors",
                    mode === m.id
                      ? "bg-polaris-100 text-polaris-700 ring-polaris-300 dark:bg-polaris-400/25 dark:text-polaris-100 dark:ring-polaris-400/50"
                      // text-ink + text-ink-dim already swap to LIGHT in dark mode
                      // via the CSS-var-driven palette. Don't override with text-paper.
                      : "bg-paper-card text-ink-dim ring-polaris-200 hover:text-ink hover:ring-polaris-300 dark:bg-white/[0.06] dark:ring-white/[0.18] dark:hover:bg-white/[0.12]",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="sm:ml-auto sm:w-[280px]">
              <CompactModelPicker
                theme="light"
                model={model}
                setModel={setModel}
                availableModels={availableModels}
                providers={providers}
                allowPaid={allowPaid}
                setAllowPaid={setAllowPaid}
                offline={offline}
                setOffline={setOffline}
                onRefresh={() => refreshProviders({ reprobeOllama: true })}
                modeChip={mode[0].toUpperCase() + mode.slice(1)}
                routeMode={routeMode}
                setRouteMode={setRouteMode}
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-y px-4 sm:px-6 lg:px-10 py-5 lg:py-6 space-y-5">
          {messages.map((m) => <BigBubble key={m.id} m={m} initials={initials} gapRows={gapRows} />)}
          {thinking && streaming && (
            <div className="max-w-3xl mx-auto flex items-center gap-2 text-ink-muted pl-10 text-[12.5px]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-polaris-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-polaris-500" />
              </span>
              <span>{thinking}</span>
            </div>
          )}
          {routeInfo && !streaming && (
            <div className="max-w-3xl mx-auto pl-10 text-[10.5px] font-mono text-ink-muted" title={routeInfo.reason}>
              Routed → {routeInfo.provider} · {routeInfo.model}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="px-4 sm:px-6 lg:px-10 pb-4 lg:pb-6 pt-3 border-t border-polaris-500/10 bg-paper">
          <div className="bg-paper-card hairline rounded-2xl p-3 max-w-3xl mx-auto focus-within:shadow-[0_0_0_2px_rgba(196,125,78,0.18)]">
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2} placeholder="Ask the Strategist anything — your profile, your KB, your roadmap, the live web."
              className="w-full bg-transparent text-[14px] placeholder-ink-muted outline-none resize-none" />
            <div className="flex items-center gap-2 pt-2 border-t border-polaris-500/10 mt-2">
              <CapabilityChip tone="polaris" icon={<Icon.book size={11} />} label="KB grounded" />
              <CapabilityChip tone="aurora" icon={<Icon.spark size={11} />} label="Cites sources" />
              <CapabilityChip tone="nova" icon={<WebDot />} label="Live web" />
              <div className="ml-auto flex items-center gap-2">
                {remaining !== null && <span className="text-[10.5px] font-mono text-ink-muted">{remaining} left</span>}
                <span className="text-[10.5px] font-mono text-ink-muted">↩ to send</span>
                <button onClick={() => send()} disabled={streaming || !input.trim()} className="h-8 px-3 rounded-lg bg-ink text-paper text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-polaris-700 disabled:opacity-50 transition-colors">
                  <Icon.send size={12} /> Send
                </button>
              </div>
            </div>
          </div>
          <div className="max-w-3xl mx-auto mt-2 flex flex-wrap items-center gap-1.5">
            {SUGGESTIONS.map((q) => (
              <button key={q} onClick={() => send(q)} disabled={streaming}
                className="text-[11.5px] px-2.5 py-1 rounded-full bg-paper-card hairline text-ink-dim hover:text-ink hover:bg-paper-soft disabled:opacity-50">
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right context strip (desktop only — grid drops it below xl) ─── */}
      <div className={cn("border-l border-polaris-500/10 bg-paper-soft/40 p-5 min-h-0 overflow-y-auto overscroll-contain scroll-y", bp !== "desktop" && "hidden")}>
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-muted font-medium mb-3">Context</div>
        <Card className="p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Avatar initials={initials} size={28} />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-ink leading-none truncate">{studentName}</div>
              <div className="text-[10.5px] text-ink-dim mt-0.5">{grade}</div>
            </div>
          </div>
          <dl className="text-[12px] space-y-1 mt-2">
            {contextRows.map((r) => (
              <div key={r.k} className="flex justify-between"><dt className="text-ink-muted">{r.k}</dt><dd className="font-mono text-ink">{r.v}</dd></div>
            ))}
          </dl>
        </Card>

        <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-muted font-medium mb-2 mt-6">Tools the Strategist can use</div>
        <ul className="text-[12px] text-ink-dim space-y-1.5">
          {["Search KB + cite sources", "Search the live web", "Re-prioritize your roadmap", "Read a milestone in full", "Re-run the probability engine"].map((t) => (
            <li key={t} className="flex items-center gap-2"><span className="text-aurora-600"><Icon.check size={12} /></span><span>{t}</span></li>
          ))}
        </ul>
      </div>

      {quota && <QuotaModal quota={quota} onClose={() => setQuota(null)} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */

/**
 * CapabilityChip — composer "this AI can …" badges. Built for both themes:
 * soft brand-color gradient backing, ring-1 inset, small icon, pulsing dot
 * accent so they look alive instead of dead labels.
 */
function CapabilityChip({
  tone, icon, label,
}: {
  tone: "polaris" | "aurora" | "nova";
  icon: React.ReactNode;
  label: string;
}) {
  const toneClasses = {
    polaris: "from-polaris-100 to-polaris-50 text-polaris-700 ring-polaris-300/40 hover:from-polaris-200 hover:to-polaris-100 dark:from-polaris-400/25 dark:to-polaris-400/10 dark:text-polaris-100 dark:ring-polaris-400/40 dark:hover:from-polaris-400/35",
    aurora:  "from-aurora-100 to-aurora-50 text-aurora-700 ring-aurora-400/40 hover:from-aurora-200 hover:to-aurora-100 dark:from-aurora-400/25 dark:to-aurora-400/10 dark:text-aurora-100 dark:ring-aurora-400/40 dark:hover:from-aurora-400/35",
    nova:    "from-nova-100 to-nova-50 text-nova-700 ring-nova-400/40 hover:from-nova-200 hover:to-nova-100 dark:from-nova-400/25 dark:to-nova-400/10 dark:text-nova-100 dark:ring-nova-400/40 dark:hover:from-nova-400/35",
  }[tone];
  const dotColor = {
    polaris: "bg-polaris-500 dark:bg-polaris-300",
    aurora:  "bg-aurora-500 dark:bg-aurora-300",
    nova:    "bg-nova-500 dark:bg-nova-300",
  }[tone];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
      "bg-gradient-to-br ring-1 ring-inset transition-all duration-200",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
      toneClasses,
    )}>
      <span className="relative flex h-1.5 w-1.5">
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", dotColor)}/>
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotColor)}/>
      </span>
      <span className="opacity-80">{icon}</span>
      {label}
    </span>
  );
}

function WebDot() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M2 12h20"/>
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>
    </svg>
  );
}

function BigBubble({ m, initials, gapRows }: { m: Msg; initials: string; gapRows: GapRow[] }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end gap-3 max-w-3xl mx-auto animate-fadeUp">
        <div className="max-w-[70%] bg-polaris-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] leading-relaxed shadow-sm">{m.text}</div>
        <Avatar initials={initials} size={28} />
      </div>
    );
  }
  const citationSources: CitationSource[] = m.sources.map((s) => ({
    label: s.label,
    uri: s.uri,
    kind: s.kind,
  }));

  return (
    <div className="flex gap-3 max-w-3xl mx-auto items-start animate-fadeUp">
      <Avatar initials="P" size={28} color="ink" />
      <div className="max-w-[88%] space-y-2.5 min-w-0 flex-1">
        {m.text && (
          <div className="bg-paper-card hairline rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm">
            <MarkdownMessage text={m.text} sources={citationSources} theme="light" />
          </div>
        )}
        {m.gap && <GapAnalysis rows={gapRows} />}
        {m.sources.length > 0 && (
          <SourceFooter sources={m.sources} />
        )}
      </div>
    </div>
  );
}

function SourceFooter({ sources }: { sources: WebSource[] }) {
  return (
    <div className="pl-1 pt-1">
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-ink-muted font-medium mb-1.5">Sources</div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => {
          const isWeb = s.kind === "web" && /^https?:/.test(s.uri);
          const n = i + 1;
          const chipCls = cn(
            "group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all max-w-[280px] text-[11.5px]",
            isWeb
              ? "text-polaris-700 bg-polaris-50 hairline hover:bg-polaris-100 hover:shadow-sm"
              : s.kind === "roadmap"
                ? "text-nova-700 bg-nova-100 ring-1 ring-inset ring-nova-400/30"
                : "text-ink-dim bg-paper-card hairline",
          );
          const content = (
            <>
              <span className="font-mono text-[10px] font-semibold opacity-70">{n}</span>
              <Icon.link size={10} />
              <span className="truncate">{s.label}</span>
            </>
          );
          if (isWeb) {
            return (
              <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className={chipCls} title={s.uri}>
                {content}
              </a>
            );
          }
          return (
            <span key={i} className={chipCls} title={s.uri}>
              {content}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function GapAnalysis({ rows }: { rows: GapRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2.5 border-b border-polaris-500/10 flex items-center gap-2">
        <Icon.spark size={14} />
        <div className="text-[12.5px] font-semibold text-ink">Your signals vs. the admit-median reference</div>
        <Pill tone="aurora" className="ml-auto">engine</Pill>
      </div>
      <table className="w-full text-[12.5px]">
        <thead className="text-[10.5px] uppercase tracking-wider text-ink-muted font-medium">
          <tr className="text-left">
            <th className="px-4 py-1.5 font-medium">Signal</th>
            <th className="px-2 py-1.5 font-medium">You</th>
            <th className="px-2 py-1.5 font-medium">Admit ref.</th>
            <th className="px-4 py-1.5 font-medium">Next move</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-polaris-500/10">
              <td className="px-4 py-2 text-ink">{r.signal}</td>
              <td className="px-2 py-2 font-mono text-ink-dim">{r.you}</td>
              <td className="px-2 py-2 font-mono text-aurora-600">{r.admit}</td>
              <td className="px-4 py-2 text-polaris-500 font-medium">{r.move}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MODEL PICKER — light theme variant (different from the dark right-rail)
   ════════════════════════════════════════════════════════════════════════ */

function ModelPicker({
  model, setModel, availableModels, providers, allowPaid, setAllowPaid, offline, setOffline, onRefresh,
}: {
  model: ModelChoice;
  setModel: (m: ModelChoice) => void;
  availableModels: Array<{ providerId: string; providerName: string; modelId: string; modelLabel: string; tier: Tier; legacy: boolean }>;
  providers: ProviderInfo[];
  allowPaid: boolean;
  setAllowPaid: (b: boolean) => void;
  offline: boolean;
  setOffline: (b: boolean) => void;
  onRefresh: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const ollamaProvider = providers.find((p) => p.id === "ollama");
  const ollamaReachable = !!ollamaProvider?.configured;
  const ollamaModelCount = ollamaProvider?.models.length ?? 0;

  async function refresh() {
    setRefreshing(true);
    try { await onRefresh(); }
    finally { setRefreshing(false); }
  }

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (model === "auto") return;
    const picked = availableModels.find((m) => m.providerId === model.providerId && m.modelId === model.modelId);
    if (picked?.legacy) setShowLegacy(true);
  }, [model, availableModels]);

  const currentLabel = model === "auto"
    ? "Auto (smart route)"
    : availableModels.find((m) => m.providerId === model.providerId && m.modelId === model.modelId)?.modelLabel
      ?? `${model.providerId} · ${model.modelId}`;

  const current = availableModels.filter((m) => !m.legacy);
  const legacy = availableModels.filter((m) => m.legacy);
  const unconfigured = providers.filter((p) => !p.configured);

  const groupBy = (arr: typeof availableModels) => {
    const g = new Map<string, typeof availableModels>();
    for (const m of arr) {
      const a = g.get(m.providerId) ?? [];
      a.push(m);
      g.set(m.providerId, a);
    }
    return g;
  };
  const currentGroups = groupBy(current);
  const legacyGroups = groupBy(legacy);

  function renderGroup(providerId: string, models: typeof availableModels) {
    const provName = providers.find((p) => p.id === providerId)?.name ?? providerId;
    return (
      <div key={providerId}>
        <div className="px-3 pt-2 pb-1 text-[9.5px] uppercase tracking-[0.15em] text-ink-muted font-medium">{provName}</div>
        {models.map((m) => {
          const active = model !== "auto" && model.providerId === m.providerId && m.modelId === model.modelId;
          return (
            <button
              key={m.modelId}
              type="button"
              onClick={() => { setModel({ providerId: m.providerId, modelId: m.modelId }); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[12px] hover:bg-paper-soft transition-colors flex items-center gap-2",
                active && "bg-polaris-50",
              )}
            >
              <span className="flex-1 truncate text-ink">{m.modelLabel}</span>
              <TierTagLight tier={m.tier}/>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-paper-card hairline rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-left text-[11.5px] hover:bg-paper-soft transition-colors dark:bg-white/[0.06] dark:ring-1 dark:ring-inset dark:ring-white/[0.10] dark:hover:bg-white/[0.10]"
      >
        <span className="text-ink-muted shrink-0">Model</span>
        <span className="truncate flex-1 text-ink">{currentLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="absolute z-30 right-0 left-0 mt-1.5 max-h-[480px] overflow-y-auto rounded-xl bg-paper-card hairline shadow-xl py-1.5 dark:bg-paper-deep dark:ring-1 dark:ring-inset dark:ring-white/[0.10]">
          {/* Local LLM status */}
          <div className="px-3 pt-2 pb-1.5 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {ollamaReachable && <span className="absolute inline-flex h-full w-full rounded-full bg-aurora-500 opacity-60 animate-ping"/>}
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", ollamaReachable ? "bg-aurora-500" : "bg-rose-500/70")}/>
            </span>
            <span className="text-[10.5px] font-mono text-ink-muted flex-1">
              {ollamaReachable
                ? `Ollama: ${ollamaModelCount} local model${ollamaModelCount === 1 ? "" : "s"}`
                : "Ollama: offline"}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void refresh(); }}
              disabled={refreshing}
              title="Re-probe Ollama"
              className="text-[10.5px] text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1 disabled:opacity-60"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(refreshing && "animate-spin")}>
                <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              {refreshing ? "…" : "refresh"}
            </button>
            <a
              href="/settings#local-llm"
              className="text-[10.5px] text-polaris-600 hover:text-polaris-700 dark:text-polaris-300 dark:hover:text-polaris-100 transition-colors"
              title="Set up Ollama"
            >
              setup
            </a>
          </div>
          <div className="my-1 mx-3 h-px bg-polaris-500/10 dark:bg-white/[0.06]"/>

          <button
            type="button"
            onClick={() => { setModel("auto"); setOpen(false); }}
            className={cn(
              "w-full text-left px-3 py-2 text-[12px] hover:bg-paper-soft transition-colors flex items-start gap-2",
              model === "auto" && "bg-polaris-50 dark:bg-polaris-400/15",
            )}
          >
            <span className="text-polaris-500">★</span>
            <span className="flex-1">
              <div className="font-medium text-ink">Auto (smart route)</div>
              <div className="text-[10.5px] text-ink-muted mt-0.5">Picks the best current-gen free/local model.</div>
            </span>
          </button>

          <div className="my-1 mx-3 h-px bg-polaris-500/10 dark:bg-white/[0.06]"/>

          {[...currentGroups.entries()].map(([id, ms]) => renderGroup(id, ms))}

          {availableModels.length === 0 && (
            <div className="px-3 py-3 text-[12px] text-ink-dim">
              {offline ? (
                ollamaReachable ? (
                  <>No local models installed. <a href="/settings#local-llm" className="text-polaris-600 dark:text-polaris-300 hover:underline">Pull one →</a></>
                ) : (
                  <>Ollama isn&apos;t running. <a href="/settings#local-llm" className="text-polaris-600 dark:text-polaris-300 hover:underline">Set up local LLM →</a></>
                )
              ) : (
                "No models match current filters. Disable Offline or enable Allow paid."
              )}
            </div>
          )}

          {legacy.length > 0 && (
            <>
              <div className="my-1 mx-3 h-px bg-polaris-500/10"/>
              <button
                type="button"
                onClick={() => setShowLegacy((s) => !s)}
                className="w-full text-left px-3 py-1.5 text-[11px] text-ink-muted hover:text-ink transition-colors flex items-center gap-1.5"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", showLegacy && "rotate-90")}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
                {showLegacy ? "Hide older models" : `Show older models (${legacy.length})`}
              </button>
              {showLegacy && [...legacyGroups.entries()].map(([id, ms]) => renderGroup(id, ms))}
            </>
          )}

          <div className="my-1 mx-3 h-px bg-polaris-500/10"/>
          <div className="px-3 py-2 flex items-center gap-3 text-[11px] text-ink-dim">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={allowPaid} onChange={(e) => setAllowPaid(e.target.checked)} className="accent-polaris-500"/>
              Allow paid
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} className="accent-polaris-500"/>
              Offline (local only)
            </label>
          </div>

          {unconfigured.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-ink-muted">
              Not configured: {unconfigured.map((p) => p.name).join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TierTagLight({ tier }: { tier: Tier }) {
  const cls =
    tier === "local" ? "text-aurora-700 bg-aurora-100 ring-aurora-400/30" :
    tier === "free"  ? "text-polaris-700 bg-polaris-100 ring-polaris-400/30" :
                       "text-nova-700 bg-nova-100 ring-nova-400/30";
  return (
    <span className={cn("text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md ring-1 ring-inset", cls)}>
      {tier}
    </span>
  );
}

/* ─── helpers ─── */

function patchLast(m: Msg[], fn: (msg: Msg) => Msg): Msg[] {
  if (!m.length) return m;
  const last = m[m.length - 1];
  if (last.role !== "agent") return m;
  return [...m.slice(0, -1), fn(last)];
}

async function consumeSse(reader: ReadableStreamDefaultReader<Uint8Array>, onChunk: (c: StrategistChunk) => void) {
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of raw.split("\n")) {
        if (!line.startsWith("data:")) continue;
        try { onChunk(JSON.parse(line.slice(5).trim()) as StrategistChunk); } catch { /* ignore */ }
      }
    }
  }
}
