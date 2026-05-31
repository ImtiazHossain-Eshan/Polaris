"use client";

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
import {
  Reveal,
  StaggerContainer,
  StaggerItem,
  MagneticWrap,
  TextReveal,
} from "@/lib/animations";
import {
  useFadeUp,
  useStaggerReveal,
  useParallax,
  useScaleReveal,
  useMagnetic,
} from "@/lib/animations";

export default function HomePage() {
  const { t } = useLang();

  return (
    <main className="min-h-screen overflow-hidden">
      <Nav />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-24">
        <div className="flex flex-col items-center text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-ink-dim">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-aurora-400 opacity-75 animate-twinkle" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-aurora-500" />
              </span>
              {t.hero.kicker}
            </span>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="mt-6 text-balance text-4xl sm:text-5xl md:text-7xl font-serif font-bold tracking-tight leading-[1.05]">
              <TextReveal
                text={`${t.hero.title1} `}
              />
              <span className="text-gradient">
                <TextReveal text={t.hero.titleAccent} />
              </span>{" "}
              <TextReveal text={t.hero.title2} />
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-5 sm:mt-6 max-w-2xl text-base sm:text-lg text-ink-dim leading-relaxed">
              {t.hero.subtitle}
            </p>
          </Reveal>

          <Reveal delay={0.35}>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <MagneticWrap>
                <Link
                  href="/onboard"
                  className="group inline-flex items-center justify-center rounded-full bg-polaris-500 px-7 py-3.5 text-base font-semibold text-white hover:bg-polaris-600 active:bg-polaris-700 transition-colors duration-150"
                >
                  {t.hero.ctaPrimary}
                  <span className="ml-1.5 inline-block group-hover:translate-x-1 transition-transform duration-200">→</span>
                </Link>
              </MagneticWrap>
              <MagneticWrap>
                <a
                  href="#how"
                  className="inline-flex items-center justify-center rounded-full border border-polaris-300 bg-white px-7 py-3.5 text-base font-medium text-ink hover:bg-polaris-50 transition-colors duration-150"
                >
                  {t.hero.ctaSecondary}
                </a>
              </MagneticWrap>
            </div>
          </Reveal>

          {/* Stat strip */}
          <StaggerContainer className="mt-12 sm:mt-16 grid w-full max-w-4xl grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StaggerItem>
              <Stat number={t.hero.stat1} label={t.hero.stat1Label} />
            </StaggerItem>
            <StaggerItem>
              <Stat number={t.hero.stat2} label={t.hero.stat2Label} />
            </StaggerItem>
            <StaggerItem>
              <Stat number={t.hero.stat3} label={t.hero.stat3Label} />
            </StaggerItem>
          </StaggerContainer>
        </div>

        {/* Floating constellation diagram */}
        <ConstellationDiagram />
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
        <Reveal>
          <Eyebrow>{t.problem.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-3 max-w-3xl text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight">
            {t.problem.title}
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-4 sm:mt-5 max-w-3xl text-base sm:text-lg text-ink-dim leading-relaxed">
            {t.problem.body}
          </p>
        </Reveal>
        <StaggerContainer className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          <StaggerItem>
            <ProblemCard
              title={t.problem.p1Title}
              body={t.problem.p1}
              icon={<IconScatter />}
              accent="polaris"
            />
          </StaggerItem>
          <StaggerItem>
            <ProblemCard
              title={t.problem.p2Title}
              body={t.problem.p2}
              icon={<IconCoins />}
              accent="nova"
            />
          </StaggerItem>
          <StaggerItem>
            <ProblemCard
              title={t.problem.p3Title}
              body={t.problem.p3}
              icon={<IconTrendDown />}
              accent="aurora"
            />
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
        <Reveal>
          <Eyebrow>{t.how.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-3 max-w-3xl text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight">
            {t.how.title}
          </h2>
        </Reveal>
        <StaggerContainer className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StaggerItem>
            <StepCard num="01" title={t.how.step1Title} body={t.how.step1} accent="from-polaris-500/20" />
          </StaggerItem>
          <StaggerItem>
            <StepCard num="02" title={t.how.step2Title} body={t.how.step2} accent="from-nova-500/20" />
          </StaggerItem>
          <StaggerItem>
            <StepCard num="03" title={t.how.step3Title} body={t.how.step3} accent="from-aurora-500/20" />
          </StaggerItem>
          <StaggerItem>
            <StepCard num="04" title={t.how.step4Title} body={t.how.step4} accent="from-polaris-400/20" />
          </StaggerItem>
        </StaggerContainer>

        {/* Architecture chip strip */}
        <Reveal delay={0.2}>
          <div className="mt-8 sm:mt-12 glass rounded-2xl p-5 sm:p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-4">AI architecture</div>
            <div className="flex flex-wrap gap-2">
              {[
                "Gemini 2.0 Flash (structured JSON)",
                "Retrieval-Augmented Generation",
                "Curated KB · 60+ docs",
                "Cosine-similarity vector search",
                "ML probability model · logistic regression",
                "Transparent factor weights",
                "Edge-deployable APIs",
                "EN / বাংলা",
              ].map((chip, i) => (
                <motion.span
                  key={chip}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                  className="text-xs rounded-full border border-polaris-500/25 bg-polaris-500/8 px-3 py-1 text-ink-dim"
                >
                  {chip}
                </motion.span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
        <Reveal>
          <Eyebrow>{t.pricing.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-3 max-w-3xl text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight">
            {t.pricing.title}
          </h2>
        </Reveal>
        <StaggerContainer className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <StaggerItem>
            <PricingCard
              tier="free"
              name={t.pricing.free.name}
              price={t.pricing.free.price}
              tagline={t.pricing.free.tagline}
              features={t.pricing.free.features as unknown as string[]}
              cta={t.pricing.ctaFree}
            />
          </StaggerItem>
          <StaggerItem>
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
          </StaggerItem>
          <StaggerItem>
            <PricingCard
              tier="elite"
              name={t.pricing.elite.name}
              price={t.pricing.elite.price}
              tagline={t.pricing.elite.tagline}
              features={t.pricing.elite.features as unknown as string[]}
              cta={t.pricing.ctaElite}
              priceSuffix={t.pricing.monthly}
            />
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* Ethics strip */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
        <Reveal>
          <div className="glass-strong rounded-3xl p-8 sm:p-10 md:p-14 relative overflow-hidden">
            <FloatingBlob className="absolute -top-24 -right-24 h-72 w-72 bg-aurora-500/10" />
            <FloatingBlob className="absolute -bottom-24 -left-24 h-72 w-72 bg-polaris-500/10" />
            <Eyebrow>Ethical AI</Eyebrow>
            <h3 className="mt-3 max-w-2xl text-2xl sm:text-3xl md:text-4xl font-serif font-bold tracking-tight">
              {t.ethics.title}
            </h3>
            <p className="mt-4 sm:mt-5 max-w-2xl text-ink-dim leading-relaxed">{t.ethics.body}</p>
          </div>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}

/* ─── Floating background blob with parallax ─── */
function FloatingBlob({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("rounded-full blur-3xl", className)}
      animate={{
        y: [0, -15, 0],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <motion.div
      className="glass rounded-2xl px-5 py-4 sm:py-5 text-left"
      whileHover={{ y: -4, boxShadow: "0 12px 40px -12px rgba(139, 94, 60, 0.15)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="text-2xl sm:text-3xl font-serif font-bold text-gradient">{number}</div>
      <div className="mt-1 text-sm text-ink-dim">{label}</div>
    </motion.div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-ink-muted">
      <motion.span
        className="h-px w-8 bg-gradient-to-r from-polaris-400 to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transformOrigin: "left" }}
      />
      {children}
    </div>
  );
}

function ProblemCard({ title, body, icon, accent }: { title: string; body: string; icon: React.ReactNode; accent: string }) {
  return (
    <motion.div
      className="glass rounded-2xl p-6 hover:border-polaris-400/30 transition-all duration-200 h-full"
      whileHover={{ y: -6, boxShadow: "0 20px 50px -15px rgba(139, 94, 60, 0.15)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className={cn(
        "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl",
        accent === "polaris" && "bg-polaris-500/10 text-polaris-500",
        accent === "nova" && "bg-nova-500/10 text-nova-500",
        accent === "aurora" && "bg-aurora-500/10 text-aurora-500",
      )}>
        {icon}
      </div>
      <div className="font-semibold text-ink mb-1.5">{title}</div>
      <div className="text-sm text-ink-dim leading-relaxed">{body}</div>
    </motion.div>
  );
}

function StepCard({ num, title, body, accent }: { num: string; title: string; body: string; accent: string }) {
  return (
    <motion.div
      className={cn(
        "glass rounded-2xl p-6 relative overflow-hidden group hover:border-polaris-400/30 transition-all duration-200 h-full"
      )}
      whileHover={{ y: -6, boxShadow: "0 20px 50px -15px rgba(139, 94, 60, 0.15)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className={cn("absolute -top-16 -right-16 h-32 w-32 rounded-full blur-2xl bg-gradient-to-br", accent, "to-transparent opacity-40 group-hover:opacity-70 transition")} />
      <div className="relative">
        <div className="text-xs font-semibold text-polaris-400 tracking-wider mb-2">{num}</div>
        <div className="font-semibold text-ink mb-2">{title}</div>
        <div className="text-sm text-ink-dim leading-relaxed">{body}</div>
      </div>
    </motion.div>
  );
}

function PricingCard({
  tier,
  name,
  price,
  tagline,
  features,
  cta,
  featured,
  badge,
  priceSuffix,
}: {
  tier: "free" | "pro" | "elite";
  name: string;
  price: string;
  tagline: string;
  features: string[];
  cta: string;
  featured?: boolean;
  badge?: string;
  priceSuffix?: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    // Free tier: go straight into the product (sign up if needed).
    if (tier === "free") {
      router.push(session ? "/dashboard" : "/signup");
      return;
    }
    // Paid tier: must be signed in, then launch checkout.
    if (!session) {
      router.push(`/signup?next=upgrade&tier=${tier}`);
      return;
    }
    setLoading(true);
    try {
      await startCheckout(tier);
    } catch {
      setLoading(false);
      router.push("/dashboard");
    }
  }

  const btnClass = cn(
    "mt-6 sm:mt-7 rounded-full px-5 py-3 text-sm font-semibold text-center transition-colors duration-150",
    featured
      ? "bg-polaris-500 text-white hover:bg-polaris-600 active:bg-polaris-700"
      : "border border-polaris-300 text-ink bg-white hover:bg-polaris-50 hover:border-polaris-400",
    loading && "opacity-70 cursor-wait",
  );

  return (
    <motion.div
      className={cn(
        "relative rounded-3xl p-6 sm:p-7 flex flex-col h-full",
        featured
          ? "glass-strong border-2 border-polaris-400/40 shadow-[0_20px_60px_-20px_rgba(139,94,60,0.25)]"
          : "glass"
      )}
      whileHover={{ y: -8, boxShadow: "0 25px 60px -15px rgba(139, 94, 60, 0.2)" }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {badge && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-polaris-500 px-3 py-1 text-xs font-semibold text-white"
          initial={{ y: -10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {badge}
        </motion.div>
      )}
      <div className="font-semibold text-ink">{name}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl sm:text-4xl font-serif font-bold text-ink">{price}</span>
        {priceSuffix && <span className="text-sm text-ink-muted">{priceSuffix}</span>}
      </div>
      <div className="mt-1.5 text-sm text-ink-dim">{tagline}</div>
      <ul className="mt-5 sm:mt-6 space-y-2.5 text-sm text-ink-dim flex-1">
        {features.map((f, i) => (
          <motion.li
            key={f}
            className="flex gap-2.5"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
          >
            <Check />
            <span>{f}</span>
          </motion.li>
        ))}
      </ul>
      <MagneticWrap>
        <button onClick={handleClick} disabled={loading} className={btnClass}>
          {loading ? "Redirecting…" : cta}
        </button>
      </MagneticWrap>
    </motion.div>
  );
}

function Check() {
  return (
    <svg className="mt-0.5 flex-none text-aurora-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/* ─── SVG Icons replacing emojis ─── */

function IconScatter() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 12h18M7 7l-4-4M17 7l4-4M7 17l-4 4M17 17l4 4" />
    </svg>
  );
}

function IconCoins() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1113.63 5.91" />
      <path d="M7 6h2v4" />
    </svg>
  );
}

function IconTrendDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

/* ─── Constellation with deterministic delays ─── */

const CONSTELLATION_NODES = [
  { x: "5%", y: "70%", label: "Profile", delay: 0 },
  { x: "25%", y: "30%", label: "RAG", delay: 0.2 },
  { x: "48%", y: "55%", label: "Strategist", delay: 0.4 },
  { x: "70%", y: "20%", label: "Probability", delay: 0.6 },
  { x: "92%", y: "50%", label: "Roadmap", delay: 0.8 },
];

function ConstellationDiagram() {
  return (
    <div aria-hidden className="mt-12 sm:mt-16 mx-auto relative max-w-4xl h-56 hidden md:block">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 220" fill="none">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5E3C" stopOpacity="0.0" />
            <stop offset="50%" stopColor="#C47D4E" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#5B8C6D" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M40 160 L200 80 L380 130 L560 60 L740 120"
          stroke="url(#lineGrad)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
        />
      </svg>
      {CONSTELLATION_NODES.map((n) => (
        <motion.div
          key={n.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: n.x, top: n.y }}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.8 + n.delay,
            duration: 0.5,
            type: "spring",
            stiffness: 200,
          }}
        >
          <motion.div
            className="relative"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: n.delay * 2,
            }}
          >
            <div className="h-3 w-3 rounded-full bg-polaris-400" />
            <motion.div
              className="absolute h-3 w-3 rounded-full bg-polaris-400/40"
              animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, delay: n.delay }}
            />
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-xs whitespace-nowrap text-ink-dim font-medium">
              {n.label}
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
