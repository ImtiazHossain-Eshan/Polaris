"use client";

/**
 * Landing page — rrad.ltd-inspired aesthetic adapted to Polaris's warm palette.
 *
 * Signature moves:
 *  - Alternating dark/light sections (data-section-theme markers feed the
 *    Nav so it adapts its theme as you scroll).
 *  - Bold sans headline + italic-serif accent word in signal-rose, ending
 *    with a period: "...your AI *North Star.*"
 *  - Pink-peach pill eyebrows above every section.
 *  - Dark hero with a constellation + perspective grid scene.
 *  - Rounded-3xl glass cards with subtle shadow, colored icon tiles.
 *  - Pulse-dot accent on the primary CTA.
 *  - Stat row with colored plus-signs and italic-serif micro-labels.
 *  - SCROLL indicator under the hero.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useLang } from "@/lib/i18n/LangProvider";
import { startCheckout } from "@/components/PlanGate";
import { cn } from "@/lib/cn";
import { Reveal } from "@/lib/animations";

export default function HomePage() {
  const { t } = useLang();

  return (
    // bg-ink on main so the area behind the floating nav pill matches the dark
    // hero (the light sections below paint their own bg-paper over this).
    <main className="min-h-screen bg-ink text-paper">
      <Nav />

      {/* ─── HERO (dark) ─────────────────────────────────────────────────── */}
      <section
        id="home"
        data-section-theme="dark"
        className="relative overflow-hidden bg-ink text-paper min-h-screen flex flex-col"
      >
        {/* Mood — warm radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 30%, rgba(196,125,78,0.22), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 80%, rgba(91,140,109,0.10), transparent 70%)",
            }}
          />
          <PerspectiveGrid />
          <BackdropConstellation />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pt-28 sm:pt-32 pb-12 text-center flex-1 flex flex-col justify-center">
          <Reveal>
            <PinkPill onDark>{t.hero.kicker}</PinkPill>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-8 mx-auto max-w-5xl text-balance font-sans text-[44px] sm:text-6xl md:text-7xl lg:text-[80px] font-bold leading-[1.04] tracking-tight text-paper">
              {t.hero.title1}{" "}
              <em className="font-serif font-normal italic text-signal-rose">
                {t.hero.titleAccent}
              </em>{" "}
              {t.hero.title2}
              <span className="text-signal-rose">.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-7 mx-auto max-w-2xl text-base sm:text-lg text-paper/70 leading-relaxed">
              {t.hero.subtitle}
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/onboard"
                className="group inline-flex items-center gap-1.5 rounded-full bg-paper px-6 py-3 text-[14px] font-semibold text-ink hover:bg-paper-soft transition-colors"
              >
                {t.hero.ctaPrimary}
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-5 py-3 text-[13.5px] font-medium text-paper hover:bg-white/15 transition-colors"
              >
                <PlayGlyph /> {t.hero.ctaSecondary}
              </Link>
              <Link
                href="/case-studies"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-5 py-3 text-[13.5px] font-medium text-paper hover:bg-white/15 transition-colors"
              >
                <BookGlyph /> Case studies
              </Link>
            </div>
          </Reveal>

          {/* Right-to-left scrolling marquee of brand-coloured glyphs */}
          <Reveal delay={0.32}>
            <div className="mt-10">
              <AppIconMarquee />
            </div>
          </Reveal>
        </div>

        {/* SCROLL cue pinned to bottom */}
        <div className="relative pb-8 flex flex-col items-center gap-2.5 text-[11px] uppercase tracking-[0.32em] text-paper/55">
          <span>scroll</span>
          <motion.span
            aria-hidden
            className="block h-10 w-px bg-paper/30 origin-top"
            animate={{ scaleY: [0.3, 1, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </section>

      {/* ─── PROBLEM (light) ─────────────────────────────────────────────── */}
      <section data-section-theme="light" className="relative bg-paper min-h-screen flex items-center">
        <div className="mx-auto max-w-6xl w-full px-6 py-24 sm:py-28 text-center">
          <Reveal>
            <PinkPill>{t.problem.eyebrow}</PinkPill>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 mx-auto max-w-4xl text-balance font-sans text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold leading-[1.08] tracking-tight text-ink">
              {t.problem.title.replace(/\.\s*$/, "")}
              <span className="text-signal-rose">.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-ink-dim leading-relaxed">
              {t.problem.body}
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <FeatureCard title={t.problem.p1Title} body={t.problem.p1} tone="polaris" icon={<IconScatter />} />
            <FeatureCard title={t.problem.p2Title} body={t.problem.p2} tone="nova"    icon={<IconCoins />}   />
            <FeatureCard title={t.problem.p3Title} body={t.problem.p3} tone="aurora"  icon={<IconTrendDown />} />
          </div>

          {/* Stat row — colored plus signs + italic micro-labels */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <StatCard tone="polaris" eyebrow="Reach" icon={<IconUsers />} number={t.hero.stat1} label={t.hero.stat1Label} />
            <StatCard tone="aurora"  eyebrow="Growth" icon={<IconChart />} number={t.hero.stat2} label={t.hero.stat2Label} />
            <StatCard tone="nova"    eyebrow="Backed by" icon={<IconStack />} number={t.hero.stat3} label={t.hero.stat3Label} />
            <StatCard tone="rose"    eyebrow="Since 2026" icon={<IconStar />} number="100%" label="Ethical AI" />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS (dark) ─────────────────────────────────────────── */}
      <section id="how" data-section-theme="dark" className="relative overflow-hidden bg-ink text-paper min-h-screen flex items-center">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(196,125,78,0.18), transparent 60%)" }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl w-full px-6 py-24 sm:py-28 text-center">
          <Reveal>
            <PinkPill onDark>{t.how.eyebrow}</PinkPill>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 mx-auto max-w-4xl text-balance font-sans text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold leading-[1.08] tracking-tight">
              {t.how.title.replace(/\.\s*$/, "")}
              <span className="text-signal-rose">.</span>
            </h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
            <StepCard num="01" title={t.how.step1Title} body={t.how.step1} tone="polaris" />
            <StepCard num="02" title={t.how.step2Title} body={t.how.step2} tone="nova" />
            <StepCard num="03" title={t.how.step3Title} body={t.how.step3} tone="aurora" />
            <StepCard num="04" title={t.how.step4Title} body={t.how.step4} tone="polaris" />
          </div>

          <Reveal delay={0.15}>
            <div className="mt-14 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-8 sm:p-10 text-left">
              <div className="text-[11px] uppercase tracking-[0.24em] text-paper/55 mb-4">
                AI architecture
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-[13.5px] text-paper/75">
                {[
                  "Gemini 2.0 Flash · structured JSON",
                  "Retrieval-Augmented Generation",
                  "Curated KB · 60+ docs",
                  "Cosine vector search",
                  "Logistic-regression probability model",
                  "Transparent factor weights",
                  "Edge-deployable APIs",
                  "EN / বাংলা",
                ].map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-signal-rose" />
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── PRICING (light) ─────────────────────────────────────────────── */}
      <section id="pricing" data-section-theme="light" className="bg-paper min-h-screen flex items-center">
        <div className="mx-auto max-w-6xl w-full px-6 py-24 sm:py-28 text-center">
          <Reveal>
            <PinkPill>{t.pricing.eyebrow}</PinkPill>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 mx-auto max-w-4xl text-balance font-sans text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold leading-[1.08] tracking-tight text-ink">
              {t.pricing.title.replace(/\.\s*$/, "")}
              <span className="text-signal-rose">.</span>
            </h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <PricingCard
              tier="free"
              name={t.pricing.free.name}
              price={t.pricing.free.price}
              tagline={t.pricing.free.tagline}
              features={t.pricing.free.features as unknown as string[]}
              cta={t.pricing.ctaFree}
            />
            <PricingCard
              tier="pro"
              featured
              badge={t.pricing.pro.badge}
              name={t.pricing.pro.name}
              price={t.pricing.pro.price}
              tagline={t.pricing.pro.tagline}
              features={t.pricing.pro.features as unknown as string[]}
              cta={t.pricing.ctaPro}
              priceSuffix={t.pricing.monthly}
            />
            <PricingCard
              tier="elite"
              name={t.pricing.elite.name}
              price={t.pricing.elite.price}
              tagline={t.pricing.elite.tagline}
              features={t.pricing.elite.features as unknown as string[]}
              cta={t.pricing.ctaElite}
              priceSuffix={t.pricing.monthly}
            />
          </div>
        </div>
      </section>

      {/* ─── ETHICS / CTA (dark) ──────────────────────────────────────────── */}
      <section data-section-theme="dark" className="relative overflow-hidden bg-ink text-paper min-h-screen flex items-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(184,84,106,0.15), transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-6xl w-full px-6 py-24 sm:py-28 text-center">
          <Reveal><PinkPill onDark>Ethical AI</PinkPill></Reveal>
          <Reveal delay={0.05}>
            <h3 className="mt-6 mx-auto max-w-3xl text-balance font-sans text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.08] tracking-tight">
              {(t.ethics.title || "").replace(/\.\s*$/, "")}
              <span className="text-signal-rose">.</span>
            </h3>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 mx-auto max-w-2xl text-paper/70 leading-relaxed">{t.ethics.body}</p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-10">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-full bg-paper px-6 py-3 text-[14px] font-semibold text-ink hover:bg-paper-soft transition-colors"
              >
                Start free — no card
                <span>→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PIECES
   ═══════════════════════════════════════════════════════════════════════════ */

function PinkPill({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.24em] font-semibold",
        onDark
          ? "bg-signal-rose/15 text-[#F5C0C9] ring-1 ring-inset ring-signal-rose/30"
          : "bg-[#F5DDE3] text-signal-rose ring-1 ring-inset ring-[#EFC8D2]",
      )}
    >
      {children}
    </span>
  );
}

function FeatureCard({
  title, body, tone, icon,
}: {
  title: string; body: string;
  tone: "polaris" | "nova" | "aurora";
  icon: React.ReactNode;
}) {
  const tile = {
    polaris: "from-polaris-300 to-polaris-500",
    nova:    "from-nova-400 to-nova-600",
    aurora:  "from-aurora-400 to-aurora-600",
  }[tone];
  return (
    <motion.div
      className="rounded-3xl bg-paper-card p-6 sm:p-7 shadow-[0_1px_0_rgba(139,94,60,0.04),_0_24px_60px_-30px_rgba(139,94,60,0.18)] border border-ink/[0.06] h-full"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div className={cn("mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl text-white bg-gradient-to-br", tile)}>
        {icon}
      </div>
      <div className="font-semibold text-ink text-[15px]">{title}</div>
      <div className="mt-1.5 text-[13.5px] text-ink-dim leading-relaxed">{body}</div>
    </motion.div>
  );
}

function StatCard({
  tone, eyebrow, number, label, icon,
}: {
  tone: "polaris" | "nova" | "aurora" | "rose";
  eyebrow: string;
  number: string;
  label: string;
  icon: React.ReactNode;
}) {
  const tile = {
    polaris: "from-polaris-300 to-polaris-500",
    nova:    "from-nova-400 to-nova-600",
    aurora:  "from-aurora-400 to-aurora-600",
    rose:    "from-[#E8A6B2] to-signal-rose",
  }[tone];
  const plus = {
    polaris: "text-polaris-500",
    nova:    "text-nova-500",
    aurora:  "text-aurora-500",
    rose:    "text-signal-rose",
  }[tone];
  return (
    <motion.div
      className="rounded-3xl bg-paper-card p-5 sm:p-6 shadow-[0_1px_0_rgba(139,94,60,0.04),_0_24px_60px_-30px_rgba(139,94,60,0.18)] border border-ink/[0.06]"
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl text-white bg-gradient-to-br", tile)}>
          {icon}
        </div>
        <span className="font-serif italic text-[12px] text-ink-muted whitespace-nowrap">↗ {eyebrow}</span>
      </div>
      <div className="mt-5 flex items-baseline gap-0.5">
        <span className="font-sans text-[36px] sm:text-[44px] font-bold text-ink leading-none tabular-nums">{number}</span>
        <span className={cn("font-sans text-[36px] sm:text-[44px] font-bold leading-none", plus)}>+</span>
      </div>
      <div className="mt-2 text-[13px] text-ink-dim">{label}</div>
    </motion.div>
  );
}

function StepCard({
  num, title, body, tone,
}: {
  num: string; title: string; body: string;
  tone: "polaris" | "nova" | "aurora";
}) {
  const accent = {
    polaris: "text-polaris-300",
    nova:    "text-nova-400",
    aurora:  "text-aurora-400",
  }[tone];
  return (
    <motion.div
      className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-6 sm:p-7 hover:bg-white/[0.07] transition-colors h-full"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div className={cn("font-mono text-[11px] tracking-[0.24em]", accent)}>{num}</div>
      <div className="mt-4 font-semibold text-paper text-[15px]">{title}</div>
      <div className="mt-2 text-[13.5px] text-paper/65 leading-relaxed">{body}</div>
    </motion.div>
  );
}

function PricingCard({
  tier, name, price, tagline, features, cta, featured, badge, priceSuffix,
}: {
  tier: "free" | "pro" | "elite";
  name: string; price: string; tagline: string;
  features: string[]; cta: string;
  featured?: boolean; badge?: string; priceSuffix?: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (tier === "free") {
      router.push(session ? "/roadmap" : "/signup");
      return;
    }
    if (!session) {
      router.push(`/signup?next=upgrade&tier=${tier}`);
      return;
    }
    setLoading(true);
    try { await startCheckout(tier); } catch { setLoading(false); router.push("/billing"); }
  }

  const btn = cn(
    "mt-7 inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-[13.5px] font-semibold transition-colors",
    featured
      ? "bg-ink text-paper hover:bg-polaris-700"
      : "bg-paper-soft text-ink hover:bg-paper-deep ring-1 ring-inset ring-ink/10",
    loading && "opacity-70 cursor-wait",
  );

  return (
    <motion.div
      className={cn(
        "relative rounded-3xl p-7 sm:p-8 flex flex-col h-full",
        featured
          ? "bg-ink text-paper shadow-[0_30px_80px_-30px_rgba(44,24,16,0.45)]"
          : "bg-paper-card border border-ink/[0.06] shadow-[0_1px_0_rgba(139,94,60,0.04),_0_24px_60px_-30px_rgba(139,94,60,0.18)]",
      )}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-signal-rose px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white shadow-md">
          {badge}
        </div>
      )}
      <div className={cn("text-sm font-medium", featured ? "text-paper/70" : "text-ink")}>{name}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className={cn("font-sans text-4xl sm:text-5xl font-bold leading-none tabular-nums", featured ? "text-paper" : "text-ink")}>
          {price}
        </span>
        {priceSuffix && (
          <span className={cn("text-sm", featured ? "text-paper/55" : "text-ink-muted")}>{priceSuffix}</span>
        )}
      </div>
      <div className={cn("mt-2 text-sm", featured ? "text-paper/65" : "text-ink-dim")}>{tagline}</div>
      <div className={cn("my-6 h-px", featured ? "bg-white/12" : "bg-ink/10")} />
      <ul className={cn("space-y-2.5 text-sm flex-1", featured ? "text-paper/80" : "text-ink-dim")}>
        {features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <Check on={featured ? "dark" : "light"} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button onClick={handleClick} disabled={loading} className={btn}>
        {loading ? "Redirecting…" : cta}
        <span>→</span>
      </button>
    </motion.div>
  );
}

function Check({ on }: { on: "light" | "dark" }) {
  return (
    <svg
      className={cn("mt-0.5 flex-none", on === "dark" ? "text-aurora-400" : "text-aurora-500")}
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO SCENE
   ═══════════════════════════════════════════════════════════════════════════ */

function PerspectiveGrid() {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 bottom-0 h-[60%] opacity-50"
      style={{
        background: `
          linear-gradient(to top, #2C1810 5%, transparent 60%),
          repeating-linear-gradient(0deg, rgba(196,125,78,0.18) 0 1px, transparent 1px 56px),
          repeating-linear-gradient(90deg, rgba(196,125,78,0.18) 0 1px, transparent 1px 56px)
        `,
        transform: "perspective(900px) rotateX(60deg)",
        transformOrigin: "bottom",
      }}
    />
  );
}

function BackdropConstellation() {
  // Rotating compass mark behind the headline — no floating tiles here, the
  // app-icon marquee at the bottom carries the icon density now.
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      <motion.div
        className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.08]"
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      >
        <svg width="720" height="720" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#C47D4E" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="#C47D4E" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="26" fill="none" stroke="#C47D4E" strokeWidth="0.3" />
          <line x1="50" y1="4" x2="50" y2="96" stroke="#C47D4E" strokeWidth="0.3" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="#C47D4E" strokeWidth="0.3" />
          <line x1="18" y1="18" x2="82" y2="82" stroke="#C47D4E" strokeWidth="0.2" />
          <line x1="82" y1="18" x2="18" y2="82" stroke="#C47D4E" strokeWidth="0.2" />
          <polygon points="50,8 53,46 50,42 47,46" fill="#C47D4E" />
        </svg>
      </motion.div>

      {/* Soft dashed constellation line stretching across */}
      <svg className="absolute inset-0 w-full h-full opacity-50" viewBox="0 0 1000 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor="#C47D4E" stopOpacity="0" />
            <stop offset="50%" stopColor="#C47D4E" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#5B8C6D" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M80 320 L260 200 L500 260 L760 200 L920 320"
          stroke="url(#lineGrad2)"
          strokeWidth="1"
          strokeDasharray="3 6"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: "easeInOut", delay: 0.4 }}
        />
      </svg>
    </div>
  );
}

/* ─── App-icon marquee — right-to-left scrolling row of stylized app tiles ─── */

type AppTile = {
  name: string;
  glyph: () => React.ReactNode;
  bg: string;     // CSS gradient OR "transparent"
  color: string;  // glyph stroke colour (used when bg === "transparent")
};

// Transparent / "PNG"-style — no tile background, each glyph rendered in its
// own brand colour against the dark hero. Soft drop-shadow keeps them legible.
const APP_TILES: AppTile[] = [
  { name: "Roadmap",     glyph: GlyphRoute,     bg: "transparent", color: "#F5A86A" },
  { name: "Strategist",  glyph: GlyphChat,      bg: "transparent", color: "#7DB6E0" },
  { name: "Deadlines",   glyph: GlyphCalendar2, bg: "transparent", color: "#F08092" },
  { name: "Universities",glyph: GlyphBuilding,  bg: "transparent", color: "#7FB890" },
  { name: "Resources",   glyph: GlyphBook2,     bg: "transparent", color: "#F0B16C" },
  { name: "North Star",  glyph: GlyphStar,      bg: "transparent", color: "#E8C757" },
  { name: "Probability", glyph: GlyphChart2,    bg: "transparent", color: "#6FBDA8" },
  { name: "Family",      glyph: GlyphUsers,     bg: "transparent", color: "#F5C0C9" },
  { name: "Profile",     glyph: GlyphUser,      bg: "transparent", color: "#C19467" },
  { name: "Connections", glyph: GlyphLink,      bg: "transparent", color: "#7AA8D0" },
];

function AppIconMarquee() {
  // Each tile carries its own trailing margin → the total width is exactly
  // 2× one set's width, so translating by -50% loops seamlessly (no half-gap
  // discrepancy that flex `gap` would introduce).
  const loop = [...APP_TILES, ...APP_TILES];
  return (
    <div aria-hidden className="relative z-[1] pointer-events-none select-none">
      <div
        className="mx-auto w-full max-w-[480px] overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
        }}
      >
        <div className="flex w-max animate-marquee-x">
          {loop.map((t, i) => (
            <AppIcon key={`${t.name}-${i}`} tile={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AppIcon({ tile }: { tile: AppTile }) {
  const Glyph = tile.glyph;
  // Trailing margin (not flex `gap`) so the looped duplicate aligns at exactly
  // -50% (no half-gap seam). No tile background / ring — just the glyph in its
  // own colour with a soft drop-shadow so it reads clearly over the dark hero.
  return (
    <div
      title={tile.name}
      className="shrink-0 mr-5 h-[40px] w-[40px] flex items-center justify-center"
      style={{
        color: tile.color,
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.35))",
      }}
    >
      <Glyph />
    </div>
  );
}

/* App-icon glyphs — sized for the marquee tiles */
function GlyphRoute() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="5" r="2" />
      <path d="M8 19h6a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h6" />
    </svg>
  );
}
function GlyphChat() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8.5 8.5 0 1 1-3.4-6.8L21 4l-1.2 3.6A8.5 8.5 0 0 1 21 12z" />
      <circle cx="9" cy="12" r="0.8" fill="currentColor" />
      <circle cx="13" cy="12" r="0.8" fill="currentColor" />
      <circle cx="17" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}
function GlyphCalendar2() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <line x1="3" y1="11" x2="21" y2="11" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <circle cx="12" cy="16" r="1.3" fill="currentColor" />
    </svg>
  );
}
function GlyphBuilding() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l9-5 9 5" />
      <path d="M5 10v9h14v-9" />
      <line x1="9" y1="14" x2="9" y2="19" />
      <line x1="12" y1="14" x2="12" y2="19" />
      <line x1="15" y1="14" x2="15" y2="19" />
    </svg>
  );
}
function GlyphBook2() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2V4z" />
      <path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8V4z" />
    </svg>
  );
}
function GlyphStar() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 14.4 8.26 21 9 16 13.74 17.2 20.5 12 17.27 6.82 20.5 8 13.74 3 9 9.6 8.26 12 2" />
    </svg>
  );
}
function GlyphChart2() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  );
}
function GlyphUsers() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function GlyphUser() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function GlyphLink() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1.5 1.5" />
      <path d="M14 10a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1.5-1.5" />
    </svg>
  );
}

/* (EducationTile + educational glyphs removed — replaced by AppIconMarquee.) */

/* ═══════════════════════════════════════════════════════════════════════════
   GLYPHS — single-stroke
   ═══════════════════════════════════════════════════════════════════════════ */
function PlayGlyph() { return (<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8V4z" /></svg>); }
function BookGlyph() { return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h10a4 4 0 0 1 4 4v12 M4 4v16 M4 20h10a4 4 0 0 0 4-4"/></svg>); }
function IconScatter() { return (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 12h18M7 7l-4-4M17 7l4-4M7 17l-4 4M17 17l4 4"/></svg>); }
function IconCoins()   { return (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1113.63 5.91"/><path d="M7 6h2v4"/></svg>); }
function IconTrendDown() { return (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>); }
function IconUsers()   { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"/></svg>); }
function IconChart()   { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>); }
function IconStack()   { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 22 8 12 14 2 8 12 2"/><polyline points="2 16 12 22 22 16"/><polyline points="2 12 12 18 22 12"/></svg>); }
function IconStar()    { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 14.4 8.26 21 9 16 13.74 17.2 20.5 12 17.27 6.82 20.5 8 13.74 3 9 9.6 8.26 12 2"/></svg>); }
