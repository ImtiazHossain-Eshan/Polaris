"use client";

/**
 * Pricing — ported from the previous landing page (same i18n strings and
 * checkout flow), restyled to the new motion language: lifted hover, featured
 * glow, staggered reveal.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n/LangProvider";
import { startCheckout } from "@/components/PlanGate";
import { cn } from "@/lib/cn";
import { SectionIntro, Accent, Dot, Reveal, GCheck, GArrow } from "./shared";

export function PricingSection() {
  const { t } = useLang();

  return (
    <section id="pricing" data-section-theme="light" className="relative bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
        <SectionIntro
          eyebrow={t.pricing.eyebrow}
          title={<>{t.pricing.title.replace(/[.।]\s*$/, "")}<Dot /></>}
          sub={<>Start free — upgrade when the roadmap <Accent>earns it</Accent>.</>}
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 text-left items-stretch">
          <PricingCard
            tier="free"
            name={t.pricing.free.name}
            price={t.pricing.free.price}
            tagline={t.pricing.free.tagline}
            features={t.pricing.free.features as unknown as string[]}
            cta={t.pricing.ctaFree}
            delay={0}
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
            delay={0.12}
          />
          <PricingCard
            tier="elite"
            name={t.pricing.elite.name}
            price={t.pricing.elite.price}
            tagline={t.pricing.elite.tagline}
            features={t.pricing.elite.features as unknown as string[]}
            cta={t.pricing.ctaElite}
            priceSuffix={t.pricing.monthly}
            delay={0.24}
          />
        </div>

        <Reveal delay={0.3}>
          <p className="mt-8 text-center text-[12.5px] text-ink-muted">
            Plans, payment methods, and receipts live in your account —{" "}
            <Link href="/billing" className="font-semibold text-polaris-500 hover:text-polaris-600 transition-colors">
              see billing
            </Link>
            . bKash, Nagad, Rocket, and cards supported.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function PricingCard({
  tier, name, price, tagline, features, cta, featured, badge, priceSuffix, delay,
}: {
  tier: "free" | "pro" | "elite";
  name: string; price: string; tagline: string;
  features: string[]; cta: string;
  featured?: boolean; badge?: string; priceSuffix?: string; delay: number;
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

  return (
    <motion.div
      className={cn(
        "relative rounded-3xl p-7 sm:p-8 flex flex-col h-full",
        featured
          ? "bg-ink text-paper shadow-[0_30px_80px_-30px_rgba(44,24,16,0.5)]"
          : "bg-paper-card border border-ink/[0.06] shadow-[0_1px_0_rgba(139,94,60,0.04),0_24px_60px_-30px_rgba(139,94,60,0.18)]",
      )}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -7 }}
    >
      {featured && (
        <div
          aria-hidden
          className="absolute -inset-px rounded-3xl pointer-events-none"
          style={{ boxShadow: "0 0 50px -12px rgba(196,125,78,0.45)" }}
        />
      )}
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
      <div className={cn("my-6 h-px", featured ? "bg-white/10" : "bg-ink/10")} />
      <ul className={cn("space-y-2.5 text-sm flex-1", featured ? "text-paper/80" : "text-ink-dim")}>
        {features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <span className={cn("mt-0.5 shrink-0", featured ? "text-aurora-400" : "text-aurora-500")}>
              <GCheck s={15} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleClick}
        disabled={loading}
        className={cn(
          "mt-7 inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-[13.5px] font-semibold transition-colors",
          featured
            ? "bg-paper text-ink hover:bg-paper-soft"
            : "bg-paper-soft text-ink hover:bg-paper-deep ring-1 ring-inset ring-ink/10",
          loading && "opacity-70 cursor-wait",
        )}
      >
        {loading ? "Redirecting…" : cta}
        <GArrow s={12} />
      </button>
    </motion.div>
  );
}
