"use client";

/**
 * Footer — light/paper themed (back to brand-warm), three layers:
 *   1. Pre-footer CTA strip — big italic-accent headline + animated CTA button
 *   2. Brand block (animated logo) + multi-column link groups with hover arrows
 *   3. Bottom bar with copyright, language, and a "live" status pill
 *
 * Animations: framer-motion. The Polaris logo hovers with a subtle scale,
 * the compass mark slow-rotates on hover, and the primary CTA button lifts +
 * deepens its shadow with a shimmer pass on the right arrow.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n/LangProvider";
import { CompassLogo } from "@/components/Nav";

export function Footer() {
  const { t } = useLang();

  const groups: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: "Product",
      links: [
        { href: "/#how", label: "How it works" },
        { href: "/#pricing", label: "Pricing" },
        { href: "/case-studies", label: "Case studies" },
        { href: "/roadmap", label: "Build your roadmap" },
      ],
    },
    {
      title: "Workspace",
      links: [
        { href: "/roadmap", label: "Roadmap" },
        { href: "/strategist", label: "Strategist" },
        { href: "/deadlines", label: "Deadlines" },
        { href: "/universities", label: "Universities" },
      ],
    },
    {
      title: "Account",
      links: [
        { href: "/signin", label: "Sign in" },
        { href: "/signup", label: "Sign up" },
        { href: "/family", label: "Family" },
        { href: "/billing", label: "Billing" },
      ],
    },
  ];

  return (
    <footer data-section-theme="light" className="relative overflow-hidden bg-paper text-ink">
      {/* Soft warm mood from the top */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(196,125,78,0.08), transparent 60%)",
        }}
      />

      {/* ─── Pre-footer CTA strip ──────────────────────────────────────── */}
      <div className="relative border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-ink-muted font-medium mb-3 flex items-center gap-2">
              <span aria-hidden className="h-px w-8 bg-ink/30" />
              Ready when you are
            </div>
            <h3 className="font-sans text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight max-w-2xl text-ink">
              Start your AI roadmap to{" "}
              <em className="font-serif font-normal italic text-signal-rose">elite admissions</em>
              <span className="text-signal-rose">.</span>
            </h3>
          </div>
          <CtaButton />
        </div>
      </div>

      {/* ─── Brand + Link columns ──────────────────────────────────────── */}
      <div className="relative mx-auto max-w-6xl px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-y-10 gap-x-8">
        {/* Animated brand block */}
        <div className="col-span-2 max-w-sm">
          <AnimatedLogo />
          <p className="mt-4 text-sm text-ink-dim leading-relaxed">{t.footer.tagline}</p>

          {/* Live status pill */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-paper-card ring-1 ring-inset ring-ink/10 px-3 py-1.5 text-[11px] text-ink-dim shadow-sm">
            <span className="relative inline-flex">
              <span className="absolute inline-flex h-full w-full rounded-full bg-aurora-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora-500" />
            </span>
            All systems operational
          </div>
        </div>

        {/* Link groups */}
        {groups.map((g) => (
          <div key={g.title}>
            <div className="text-[11px] uppercase tracking-[0.24em] text-ink-muted font-medium">
              {g.title}
            </div>
            <ul className="mt-4 space-y-2.5">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="group inline-flex items-center text-sm text-ink-dim hover:text-ink transition-colors"
                  >
                    {l.label}
                    <span
                      aria-hidden
                      className="ml-1 inline-block opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 text-signal-rose"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ─── Bottom bar ────────────────────────────────────────────────── */}
      <div className="relative border-t border-ink/10">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} Polaris</span>
            <span aria-hidden className="h-3 w-px bg-ink/15" />
            <span>{t.footer.built}</span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>EN / বাংলা</span>
            <span aria-hidden className="h-3 w-px bg-ink/15" />
            <span>v0.1</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Animated brand logo ────────────────────────────────────────────────
   Subtle hover-scale on the whole brand, plus a slow continuous rotation on
   the compass mark that speeds up on hover, and a faint glow ring that fades
   in. The text-content stays still so the wordmark reads clearly. */
function AnimatedLogo() {
  return (
    <Link href="/" className="inline-flex">
      <motion.div
        className="relative flex items-center gap-2.5"
        initial="rest"
        whileHover="hover"
      >
        {/* Glow ring */}
        <motion.span
          aria-hidden
          className="absolute -inset-2 -left-1 rounded-full bg-polaris-400/20 blur-xl"
          variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
          transition={{ duration: 0.3 }}
        />
        {/* Compass — slow rotate always, faster on hover */}
        <motion.span
          className="relative inline-flex"
          variants={{
            rest: { rotate: 0 },
            hover: { rotate: 360 },
          }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        >
          <CompassLogo />
        </motion.span>
        {/* Wordmark */}
        <motion.span
          className="relative font-serif text-[17px] font-bold tracking-tight text-ink"
          variants={{
            rest: { letterSpacing: "-0.01em" },
            hover: { letterSpacing: "0.01em" },
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          Polaris
        </motion.span>
      </motion.div>
    </Link>
  );
}

/* ─── Animated primary CTA ──────────────────────────────────────────────
   Lifts + deepens shadow on hover, arrow slides + a faint shimmer sweeps
   across left-to-right. */
function CtaButton() {
  return (
    <Link href="/roadmap" className="inline-flex shrink-0">
      <motion.span
        className="group relative inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-semibold text-paper shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] overflow-hidden"
        whileHover={{ y: -3, boxShadow: "0 22px 50px -16px rgba(0,0,0,0.45)" }}
        whileTap={{ y: -1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* Shimmer sweep across the button on hover */}
        <motion.span
          aria-hidden
          className="absolute inset-y-0 -inset-x-12 pointer-events-none"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
          }}
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        />
        <span className="relative">Start free — no card</span>
        <motion.span
          aria-hidden
          className="relative inline-block"
          variants={{ rest: { x: 0 }, hover: { x: 4 } }}
          initial="rest"
          whileHover="hover"
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
        >
          →
        </motion.span>
      </motion.span>
    </Link>
  );
}
