"use client";

/**
 * CompactModelPicker — Claude-style condensed model dropdown.
 *
 * Layout:
 *   ┌─────────────────────────────┐
 *   │ Models           ⌘ I         │
 *   ├─────────────────────────────┤
 *   │ Gemini 2.5 Flash · Default   │
 *   │                              │
 *   │ Gemini 3.5 Flash         1   │
 *   │ Gemini 2.5 Pro          2   │
 *   │ Llama 3.3 70B (Groq)    3   │
 *   │ ───── Older ─────            │
 *   │ Gemini 2.0 Flash    ✓   4   │
 *   ├─────────────────────────────┤
 *   │ ● Ollama: 2 local models     │
 *   │ Offline (local only)      ⬜  │
 *   │ Allow paid                ⬜  │
 *   └─────────────────────────────┘
 *
 * Features:
 *   • Cmd/Ctrl+I to open
 *   • Number keys 1-9 to quick-pick
 *   • Up/Down arrows to navigate, Enter to select, Esc to close
 *   • "Default" badge on the auto-recommendation
 *   • Compact tier chip on each row (free/local/paid)
 *   • Refresh + setup links for Ollama at the bottom
 *   • Light + dark theme variants
 *
 * Used by both the right-rail AgentChat (dark) and StrategistClient (light).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Tier = "free" | "paid" | "local";

export type CmpModel = {
  providerId: string;
  providerName: string;
  modelId: string;
  modelLabel: string;
  tier: Tier;
  legacy: boolean;
};

export type CmpProvider = {
  id: string;
  name: string;
  configured: boolean;
  models: Array<{ id: string; label: string; tier: Tier; legacy?: boolean }>;
};

export type CmpChoice = { providerId: string; modelId: string } | "auto";

type Props = {
  model: CmpChoice;
  setModel: (m: CmpChoice) => void;
  availableModels: CmpModel[];
  providers: CmpProvider[];
  allowPaid: boolean;
  setAllowPaid: (b: boolean) => void;
  offline: boolean;
  setOffline: (b: boolean) => void;
  onRefresh: () => Promise<void> | void;
  theme: "light" | "dark";
  /** Mode pip shown next to the trigger button (e.g. "High" / "Research"). */
  modeChip?: string;
  /** Anchor direction. Default "down". */
  direction?: "up" | "down";
};

const MAX_SHORTCUT = 9;

export function CompactModelPicker({
  model, setModel, availableModels, providers, allowPaid, setAllowPaid,
  offline, setOffline, onRefresh, theme, modeChip, direction = "down",
}: Props) {
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const ollamaProvider = providers.find((p) => p.id === "ollama");
  const ollamaReachable = !!ollamaProvider?.configured;
  const ollamaModelCount = ollamaProvider?.models.length ?? 0;

  /* ─── Split current vs legacy + flatten shortcut order ─── */
  const current = useMemo(() => availableModels.filter((m) => !m.legacy), [availableModels]);
  const legacy  = useMemo(() => availableModels.filter((m) => m.legacy),  [availableModels]);

  // Items in the order the user navigates: auto, then current, then legacy
  // (legacy only when revealed). Each item gets a shortcut number 1-9.
  const flatList = useMemo(() => {
    const out: Array<{ kind: "auto" | "model"; data?: CmpModel }> = [
      { kind: "auto" },
    ];
    for (const m of current) out.push({ kind: "model", data: m });
    if (showLegacy) for (const m of legacy) out.push({ kind: "model", data: m });
    return out;
  }, [current, legacy, showLegacy]);

  /* ─── Active model id (for check mark + label) ─── */
  const activeKey = model === "auto" ? "auto" : `${model.providerId}::${model.modelId}`;
  const triggerLabel = useMemo(() => {
    if (model === "auto") {
      return "Auto";
    }
    return availableModels.find((m) => m.providerId === model.providerId && m.modelId === model.modelId)?.modelLabel
      ?? model.modelId;
  }, [model, availableModels]);

  /* ─── Outside click ─── */
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Open with Cmd/Ctrl + I  (don't trigger while typing in inputs).
      const tgt = e.target as HTMLElement | null;
      const isTyping = tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && (e.key === "i" || e.key === "I") && !isTyping) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;

      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "ArrowDown") { setFocusIdx((i) => Math.min(flatList.length - 1, i + 1)); e.preventDefault(); return; }
      if (e.key === "ArrowUp")   { setFocusIdx((i) => Math.max(0, i - 1)); e.preventDefault(); return; }
      if (e.key === "Enter") {
        const item = flatList[focusIdx];
        if (!item) return;
        if (item.kind === "auto") setModel("auto");
        else if (item.data) setModel({ providerId: item.data.providerId, modelId: item.data.modelId });
        setOpen(false);
        e.preventDefault();
        return;
      }
      // Number shortcuts 1-9 → quick pick.
      const n = parseInt(e.key, 10);
      if (Number.isInteger(n) && n >= 1 && n <= MAX_SHORTCUT) {
        // Index 0 is Auto, 1..N are models.
        const idx = n;
        const item = flatList[idx];
        if (item?.kind === "model" && item.data) {
          setModel({ providerId: item.data.providerId, modelId: item.data.modelId });
          setOpen(false);
        }
        e.preventDefault();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, focusIdx, flatList, setModel]);

  /* ─── Auto-reveal legacy if a legacy is selected ─── */
  useEffect(() => {
    if (model === "auto") return;
    const picked = availableModels.find((m) => m.providerId === model.providerId && m.modelId === model.modelId);
    if (picked?.legacy) setShowLegacy(true);
  }, [model, availableModels]);

  async function refresh() {
    setRefreshing(true);
    try { await onRefresh(); }
    finally { setRefreshing(false); }
  }

  /* ─── Theme classes ─── */
  const t = themeClasses(theme);

  return (
    <div className="relative inline-block" ref={ref}>
      {/* TRIGGER */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setFocusIdx(0); }}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg h-8 pl-2.5 pr-2 text-[12px] font-medium transition-colors",
          t.trigger,
        )}
        title="Pick a model (⌘/Ctrl + I)"
      >
        <span className="truncate max-w-[140px]">{triggerLabel}</span>
        {modeChip && (
          <span className={cn("text-[10px] uppercase tracking-wider font-bold rounded px-1.5 py-0.5", t.modeChip)}>
            {modeChip}
          </span>
        )}
        <Spinner className={cn("h-3 w-3 ml-0.5", t.spinner)}/>
        <ChevDown className={cn("h-3 w-3 transition-transform", open && "rotate-180", t.chev)}/>
      </button>

      {/* POPOVER */}
      {open && (
        <div
          className={cn(
            "absolute z-30 right-0 w-[280px] rounded-xl shadow-xl overflow-hidden",
            direction === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            t.popover,
          )}
        >
          {/* Header — "Models" + keyboard shortcut chips */}
          <div className={cn("flex items-center justify-between px-3 py-2", t.header)}>
            <span className={cn("text-[12px] font-semibold", t.headerText)}>Models</span>
            <div className="flex items-center gap-1">
              <Kbd theme={theme}>⌘</Kbd>
              <Kbd theme={theme}>I</Kbd>
            </div>
          </div>

          {/* Default / Auto */}
          <ListRow
            theme={theme}
            active={activeKey === "auto"}
            focused={focusIdx === 0}
            onMouseEnter={() => setFocusIdx(0)}
            onClick={() => { setModel("auto"); setOpen(false); }}
            label="Auto (smart route)"
            badge="Default"
            badgeTone="muted"
          />

          {/* Current generation */}
          {current.length > 0 && (
            <div className={cn("border-t", t.divider)}>
              {current.map((m, i) => {
                const idx = i + 1; // 1..N
                return (
                  <ListRow
                    key={m.providerId + "::" + m.modelId}
                    theme={theme}
                    active={activeKey === `${m.providerId}::${m.modelId}`}
                    focused={focusIdx === idx}
                    onMouseEnter={() => setFocusIdx(idx)}
                    onClick={() => { setModel({ providerId: m.providerId, modelId: m.modelId }); setOpen(false); }}
                    label={m.modelLabel}
                    shortcut={idx <= MAX_SHORTCUT ? String(idx) : undefined}
                    tier={m.tier}
                  />
                );
              })}
            </div>
          )}

          {/* Legacy reveal */}
          {legacy.length > 0 && (
            <div className={cn("border-t", t.divider)}>
              <button
                type="button"
                onClick={() => setShowLegacy((s) => !s)}
                className={cn("w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] transition-colors", t.legacyToggle)}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", showLegacy && "rotate-90")}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
                {showLegacy ? "Hide older models" : `Show older models (${legacy.length})`}
              </button>
              {showLegacy && legacy.map((m, li) => {
                const idx = current.length + 1 + li;
                return (
                  <ListRow
                    key={m.providerId + "::" + m.modelId}
                    theme={theme}
                    active={activeKey === `${m.providerId}::${m.modelId}`}
                    focused={focusIdx === idx}
                    onMouseEnter={() => setFocusIdx(idx)}
                    onClick={() => { setModel({ providerId: m.providerId, modelId: m.modelId }); setOpen(false); }}
                    label={m.modelLabel}
                    shortcut={idx <= MAX_SHORTCUT ? String(idx) : undefined}
                    tier={m.tier}
                    legacy
                  />
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {availableModels.length === 0 && (
            <div className={cn("px-3 py-3 text-[11.5px]", t.emptyText)}>
              {offline ? (
                <>No free models available right now. <a href="/settings?tab=local-llm" className={t.link}>Check status →</a></>
              ) : (
                "No models match current filters. Disable Free-only or enable Allow paid."
              )}
            </div>
          )}

          {/* Fleet status strip */}
          <div className={cn("flex items-center gap-2 px-3 py-2 border-t", t.divider, t.statusBg)}>
            <span className="relative flex h-1.5 w-1.5">
              {ollamaReachable && <span className="absolute inline-flex h-full w-full rounded-full bg-aurora-500 opacity-60 animate-ping"/>}
              <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", ollamaReachable ? "bg-aurora-500" : "bg-rose-500/70")}/>
            </span>
            <span className={cn("text-[10.5px] font-mono flex-1 truncate", t.statusText)}>
              {ollamaReachable ? `Free fleet: ${ollamaModelCount} live` : "Free fleet: offline"}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void refresh(); }}
              disabled={refreshing}
              className={cn("text-[10.5px] transition-colors disabled:opacity-60", t.statusLink)}
              title="Re-check the hosted fleet"
            >
              <Refresh className={cn("h-3 w-3 inline mr-0.5", refreshing && "animate-spin")}/>
              {refreshing ? "…" : "refresh"}
            </button>
          </div>

          {/* Bottom toggles */}
          <div className={cn("border-t flex items-stretch", t.divider)}>
            <ToggleRow
              theme={theme}
              label="Free only"
              hint="Polaris-hosted open models"
              checked={offline}
              onChange={setOffline}
            />
            <div className={cn("w-px self-stretch", t.divider)}/>
            <ToggleRow
              theme={theme}
              label="Allow paid"
              hint="OpenAI etc."
              checked={allowPaid}
              onChange={setAllowPaid}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ROWS + BITS
   ════════════════════════════════════════════════════════════════════════ */

function ListRow({
  theme, active, focused, onClick, onMouseEnter, label, shortcut, tier, legacy, badge, badgeTone,
}: {
  theme: "light" | "dark";
  active: boolean;
  focused: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  label: string;
  shortcut?: string;
  tier?: Tier;
  legacy?: boolean;
  badge?: string;
  badgeTone?: "default" | "muted";
}) {
  const t = themeClasses(theme);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "group w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] transition-colors text-left",
        focused && t.rowFocus,
        active && t.rowActive,
      )}
    >
      {active && <CheckGlyph className={cn("h-3 w-3 shrink-0", t.checkColor)} />}
      {!active && <span className="w-3 shrink-0"/>}
      <span className={cn("truncate flex-1", t.rowText, legacy && "opacity-70")}>{label}</span>
      {badge && (
        <span className={cn("text-[9.5px] uppercase tracking-wider font-semibold", badgeTone === "muted" ? t.badgeMuted : t.badgeActive)}>
          {badge}
        </span>
      )}
      {tier && tier !== "free" && (
        <span className={cn("text-[9.5px] uppercase tracking-wider font-bold px-1 rounded ring-1 ring-inset",
          tier === "local" ? t.tierLocal : t.tierPaid,
        )}>
          {tier}
        </span>
      )}
      {shortcut && (
        <span className={cn("font-mono text-[10.5px] tabular-nums w-3 text-right", t.shortcutText)}>{shortcut}</span>
      )}
    </button>
  );
}

function ToggleRow({
  theme, label, hint, checked, onChange,
}: {
  theme: "light" | "dark";
  label: string;
  hint: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  const t = themeClasses(theme);
  return (
    <label className={cn("flex-1 flex items-center gap-2 px-3 py-2 cursor-pointer", t.toggleHover)}>
      <div className="min-w-0 flex-1">
        <div className={cn("text-[11.5px] font-medium leading-tight", t.toggleLabel)}>{label}</div>
        <div className={cn("text-[10px] mt-0.5", t.toggleHint)}>{hint}</div>
      </div>
      <Switch checked={checked} onChange={onChange} theme={theme} />
    </label>
  );
}

function Switch({ checked, onChange, theme }: { checked: boolean; onChange: (b: boolean) => void; theme: "light" | "dark" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-200 ring-1 ring-inset",
        checked
          ? "bg-polaris-500 ring-polaris-500"
          : theme === "dark"
            ? "bg-white/[0.10] ring-white/[0.18]"
            : "bg-paper-deep ring-polaris-500/20",
      )}
    >
      <span className={cn(
        "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200",
        checked ? "translate-x-3.5" : "translate-x-0.5",
      )}/>
    </button>
  );
}

function Kbd({ theme, children }: { theme: "light" | "dark"; children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded font-mono text-[9.5px] font-bold",
      theme === "dark"
        ? "bg-white/[0.08] text-paper/65 ring-1 ring-inset ring-white/[0.10]"
        : "bg-paper-soft text-ink-dim ring-1 ring-inset ring-polaris-500/15",
    )}>{children}</span>
  );
}

/* ─── Theme map ─── */
function themeClasses(theme: "light" | "dark") {
  if (theme === "dark") {
    return {
      trigger: "bg-white/[0.06] ring-1 ring-inset ring-white/[0.10] text-paper hover:bg-white/[0.10]",
      modeChip: "bg-white/[0.10] text-paper/75",
      spinner: "text-polaris-300",
      chev: "text-paper/55",
      popover: "bg-ink/95 backdrop-blur ring-1 ring-inset ring-white/[0.10]",
      header: "bg-white/[0.02]",
      headerText: "text-paper",
      divider: "border-white/[0.06]",
      rowFocus: "bg-white/[0.06]",
      rowActive: "bg-polaris-500/15",
      rowText: "text-paper",
      checkColor: "text-polaris-300",
      badgeMuted: "text-paper/50",
      badgeActive: "text-polaris-200",
      tierLocal: "text-aurora-200 bg-aurora-500/10 ring-aurora-400/30",
      tierPaid:  "text-nova-200 bg-nova-500/10 ring-nova-400/30",
      shortcutText: "text-paper/45",
      legacyToggle: "text-paper/55 hover:text-paper hover:bg-white/[0.04]",
      emptyText: "text-paper/65",
      link: "text-polaris-300 hover:text-polaris-100 underline underline-offset-2",
      statusBg: "bg-white/[0.02]",
      statusText: "text-paper/65",
      statusLink: "text-paper/55 hover:text-paper",
      statusLinkAccent: "text-polaris-300 hover:text-polaris-100",
      toggleHover: "hover:bg-white/[0.04]",
      toggleLabel: "text-paper",
      toggleHint: "text-paper/45",
    };
  }
  // "Light" variant rides the CSS-var palette (paper/ink auto-swap when the
  // app flips dark) — but a few hardcoded tints need explicit dark: overrides
  // or they'd render as light slabs under cream text in dark mode.
  return {
    trigger: "bg-paper-card ring-1 ring-inset ring-polaris-500/15 text-ink hover:bg-paper-soft dark:ring-white/[0.14]",
    modeChip: "bg-paper-soft text-ink-dim",
    spinner: "text-polaris-500",
    chev: "text-ink-muted",
    popover: "bg-paper-card ring-1 ring-inset ring-polaris-500/15 dark:bg-paper-deep dark:ring-white/[0.12]",
    header: "bg-paper-soft/40",
    headerText: "text-ink",
    divider: "border-polaris-500/10 dark:border-white/[0.08]",
    rowFocus: "bg-paper-soft",
    rowActive: "bg-polaris-50 dark:bg-polaris-400/15",
    rowText: "text-ink",
    checkColor: "text-polaris-600 dark:text-polaris-300",
    badgeMuted: "text-ink-muted",
    badgeActive: "text-polaris-600 dark:text-polaris-300",
    tierLocal: "text-aurora-700 bg-aurora-100 ring-aurora-400/40 dark:text-aurora-100 dark:bg-aurora-400/15 dark:ring-aurora-400/30",
    tierPaid:  "text-nova-600 bg-nova-100 ring-nova-400/40 dark:text-nova-100 dark:bg-nova-400/15 dark:ring-nova-400/30",
    shortcutText: "text-ink-muted",
    legacyToggle: "text-ink-muted hover:text-ink hover:bg-paper-soft",
    emptyText: "text-ink-dim",
    link: "text-polaris-600 hover:text-polaris-700 underline underline-offset-2 dark:text-polaris-300 dark:hover:text-polaris-100",
    statusBg: "bg-paper-soft/40",
    statusText: "text-ink-muted",
    statusLink: "text-ink-muted hover:text-ink",
    statusLinkAccent: "text-polaris-600 hover:text-polaris-700 dark:text-polaris-300 dark:hover:text-polaris-100",
    toggleHover: "hover:bg-paper-soft",
    toggleLabel: "text-ink",
    toggleHint: "text-ink-muted",
  };
}

/* ─── Glyphs ─── */
function CheckGlyph({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5"/></svg>;
}
function ChevDown({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9l6 6 6-6"/></svg>;
}
function Refresh({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
}
function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"/>
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin origin-center"/>
    </svg>
  );
}
