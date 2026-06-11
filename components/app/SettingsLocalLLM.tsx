"use client";

/**
 * Settings → "Free models" panel.
 *
 * Polaris hosts a fleet of open-source LLMs (Llama, Qwen, Mistral, DeepSeek)
 * on its own infrastructure and exposes them to every user through the
 * Strategist API — no install, no setup, no machine requirements. This
 * panel just surfaces:
 *   • Live status of the hosted fleet (auto-refresh when offline)
 *   • Catalog of currently available models with descriptions + sizes
 *   • Filter by intent (general / coding / reasoning / tiny)
 *
 * Backed by /api/providers/ollama, but the framing is "Polaris fleet" —
 * not user-side installation.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type ModelRow = {
  name: string;
  parameterSize?: string;
  sizeBytes?: number;
  family?: string;
  quant?: string;
  modifiedAt?: string;
};

type Status = {
  baseUrl: string;
  reachable: boolean;
  version?: string;
  latencyMs?: number;
  models: ModelRow[];
  errorMessage?: string;
};

type Category = "general" | "coding" | "reasoning" | "tiny";

const CATALOG: Array<{
  id: string;
  label: string;
  desc: string;
  size: string;
  category: Category;
}> = [
  { id: "llama3.2:3b",      label: "Llama 3.2 (3B)",      desc: "Lightning fast, multilingual. Default for short turn-around answers.",     size: "3B params",  category: "tiny" },
  { id: "llama3.1:8b",      label: "Llama 3.1 (8B)",      desc: "Balanced quality + speed across general questions.",                       size: "8B params",  category: "general" },
  { id: "qwen2.5:7b",       label: "Qwen 2.5 (7B)",       desc: "Strong general-purpose model with excellent multilingual reach.",          size: "7B params",  category: "general" },
  { id: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder (7B)", desc: "Best small coding model — competes with frontier proprietary on code.",   size: "7B params",  category: "coding" },
  { id: "deepseek-r1:7b",   label: "DeepSeek R1 (7B)",    desc: "Reasoning-tuned. Distills R1's chain-of-thought for step-by-step work.",   size: "7B params",  category: "reasoning" },
  { id: "deepseek-r1:14b",  label: "DeepSeek R1 (14B)",   desc: "Heavier reasoning model for harder analytical tasks.",                     size: "14B params", category: "reasoning" },
  { id: "phi3.5:3.8b",      label: "Phi 3.5 (3.8B)",      desc: "Microsoft's tiny model. Punches above its weight at math + reasoning.",    size: "3.8B params", category: "tiny" },
  { id: "mistral:7b",       label: "Mistral (7B)",        desc: "Classic open-weights model, reliable baseline for general questions.",     size: "7B params",  category: "general" },
];

export function SettingsLocalLLM() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | Category>("all");

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/providers/ollama", {
        method: forceRefresh ? "DELETE" : "GET",
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { status: Status };
        setStatus(data.status);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Auto-poll every 30s when offline so transient cluster blips recover quickly.
  useEffect(() => {
    if (!status || status.reachable) return;
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [status, load]);

  const availableNames = useMemo(() => new Set(status?.models.map((m) => m.name) ?? []), [status]);
  const visible = useMemo(() => {
    if (filter === "all") return CATALOG;
    return CATALOG.filter((s) => s.category === filter);
  }, [filter]);

  return (
    <div className="space-y-5">
      <StatusBanner
        loading={loading}
        refreshing={refreshing}
        status={status}
        onRefresh={() => void load(true)}
      />

      {/* ─── How this works ─── */}
      <div className="rounded-xl bg-paper-soft ring-1 ring-inset ring-polaris-500/10 dark:ring-white/10 p-4 text-[12.5px] text-ink-dim leading-relaxed">
        <div className="text-[11px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">
          How free models work
        </div>
        Polaris hosts these open-source LLMs on its own infrastructure. They&apos;re free for every plan,
        cost nothing per request, and are picked by the smart router whenever your selected mode is
        suited to them. You don&apos;t need to install or run anything — pick a model from the dropdown in
        the Strategist and it&apos;ll route automatically.
      </div>

      {/* ─── Catalog ─── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-muted font-medium">Available models</div>
            <div className="text-[12.5px] text-ink-dim mt-0.5">Filter by what you need.</div>
          </div>
          <div className="flex items-center gap-1">
            {(["all", "tiny", "general", "coding", "reasoning"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[10.5px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset transition-colors capitalize",
                  filter === f
                    ? "bg-polaris-100 text-polaris-700 ring-polaris-300 dark:bg-polaris-400/25 dark:text-polaris-100 dark:ring-polaris-400/50"
                    : "bg-paper-card text-ink-dim ring-polaris-200 hover:ring-polaris-300 dark:bg-white/[0.06] dark:ring-white/[0.18]",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <ul className="space-y-2">
          {visible.map((m) => {
            const isAvailable = availableNames.has(m.id);
            return (
              <li
                key={m.id}
                className={cn(
                  "rounded-xl ring-1 ring-inset bg-paper-card p-3 flex items-center gap-3 transition-colors",
                  isAvailable ? "ring-aurora-400/40 dark:ring-aurora-400/30" : "ring-polaris-500/15 dark:ring-white/10",
                )}
              >
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-polaris-500/15 to-nova-500/15 dark:from-polaris-400/20 dark:to-nova-400/20 ring-1 ring-inset ring-polaris-500/20 dark:ring-white/10 inline-flex items-center justify-center text-[11px] font-mono font-bold text-polaris-700 dark:text-polaris-100 shrink-0">
                  {m.size.replace(/[^\d.]/g, "").slice(0, 4) || "•"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-ink">{m.label}</span>
                    <span className="font-mono text-[10.5px] text-ink-muted">{m.size}</span>
                    <span className="text-[10px] uppercase tracking-wider font-medium text-ink-muted">{m.category}</span>
                    {isAvailable && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-aurora-700 dark:text-aurora-100 bg-aurora-100 dark:bg-aurora-400/20 ring-1 ring-inset ring-aurora-400/40 rounded-full px-1.5 py-[1px]">
                        live
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-ink-dim mt-0.5">{m.desc}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STATUS BANNER
   ════════════════════════════════════════════════════════════════════════ */

function StatusBanner({
  loading, refreshing, status, onRefresh,
}: {
  loading: boolean;
  refreshing: boolean;
  status: Status | null;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-paper-soft ring-1 ring-inset ring-polaris-500/10 dark:ring-white/10 p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-paper-card ring-1 ring-inset ring-polaris-500/10 dark:ring-white/10 inline-flex items-center justify-center">
          <Spinner />
        </div>
        <div className="text-[13px] text-ink-dim">Checking the Polaris fleet…</div>
      </div>
    );
  }
  const reachable = status?.reachable;
  const count = status?.models.length ?? 0;
  return (
    <div
      className={cn(
        "rounded-2xl p-4 ring-1 ring-inset flex items-center gap-3",
        reachable
          ? "bg-aurora-100/60 dark:bg-aurora-400/10 ring-aurora-400/40"
          : "bg-rose-50 dark:bg-rose-400/10 ring-rose-200 dark:ring-rose-400/30",
      )}
    >
      <div
        className={cn(
          "h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0 shadow-sm",
          reachable ? "bg-aurora-500 text-white" : "bg-rose-500 text-white",
        )}
      >
        {reachable ? <CheckGlyph /> : <XGlyph />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-ink">
          {reachable ? "Polaris free models — online" : "Polaris free models — unavailable"}
        </div>
        <div className="text-[12px] text-ink-dim mt-0.5">
          {reachable ? (
            <>
              {count} model{count === 1 ? "" : "s"} live on the fleet
              {status?.latencyMs !== undefined && <> · {status.latencyMs}ms round-trip</>}
              {" · routed automatically by the Strategist"}
            </>
          ) : (
            <>
              We&apos;re having trouble reaching the hosted fleet right now. Paid providers continue to
              work; we&apos;ll auto-retry every 30 seconds.
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className={cn(
          "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors inline-flex items-center gap-1.5 ring-1 ring-inset",
          reachable
            ? "bg-aurora-100 text-aurora-700 ring-aurora-400/40 hover:bg-aurora-200 dark:bg-aurora-400/20 dark:text-aurora-100"
            : "bg-paper-card text-ink ring-polaris-300 hover:bg-paper-soft",
          refreshing && "opacity-60 cursor-wait",
        )}
      >
        <RefreshGlyph spinning={refreshing} />
        Refresh
      </button>
    </div>
  );
}

/* ─── Glyphs ─── */
function CheckGlyph() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
}
function XGlyph() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
}
function RefreshGlyph({ spinning }: { spinning?: boolean }) {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(spinning && "animate-spin")}><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
}
function Spinner() {
  return <div className="h-4 w-4 rounded-full border-2 border-polaris-200 border-t-polaris-500 animate-spin"/>;
}
