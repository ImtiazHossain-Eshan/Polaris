"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useLang } from "@/lib/i18n/LangProvider";
import { usePlan, UpgradeCard } from "@/components/PlanGate";
import { cn } from "@/lib/cn";
import {
  type StudentProfile,
  type Country,
  type Degree,
  type ECCategory,
  type GradeLevel,
  type Tier,
  PROFILE_KEY,
  ROADMAP_KEY,
} from "@/lib/profile";

const GRADES: GradeLevel[] = ["middle", "early-hs", "late-hs", "undergrad", "recent-grad"];
const COUNTRIES: Country[] = [
  "Bangladesh",
  "India",
  "Pakistan",
  "Nepal",
  "Other South Asia",
  "Other",
];
const DEGREES: Degree[] = ["undergrad", "masters", "phd", "undecided"];
const ECS: ECCategory[] = [
  "Olympiads",
  "Research",
  "Leadership",
  "Community",
  "Sports/Arts",
  "Internships",
];
const TIERS: Tier[] = ["elite", "top50", "top200", "regional"];

export default function OnboardPage() {
  const { t } = useLang();
  const router = useRouter();
  const { data: session } = useSession();
  const { plan } = usePlan();
  const isLoggedIn = !!session?.user;

  const [grade, setGrade] = useState<GradeLevel>("late-hs");
  const [country, setCountry] = useState<Country>("Bangladesh");
  const [degree, setDegree] = useState<Degree>("undergrad");
  const [gpa, setGpa] = useState(3.8);
  const [ecs, setEcs] = useState<ECCategory[]>([]);
  const [tier, setTier] = useState<Tier>("elite");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEc(e: ECCategory) {
    setEcs((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const profile: StudentProfile = {
      grade,
      country,
      degree,
      gpa,
      ecs,
      targetTier: tier,
    };

    setSubmitting(true);
    try {
      if (!isLoggedIn) {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        window.localStorage.removeItem(ROADMAP_KEY);
      }
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      if (!isLoggedIn) {
        window.localStorage.setItem(ROADMAP_KEY, JSON.stringify(data));
      }
      // New default authenticated home is the (app) shell at /roadmap.
      router.push("/roadmap");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  // Roadmap generation (onboarding) is a Pro feature.
  if (isLoggedIn && plan === "free") {
    return (
      <main className="min-h-screen">
        <Nav />
        <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-center mb-8">
            {t.onboard.title}
          </h1>
          <UpgradeCard
            tier="pro"
            title="Build your roadmap with Pro"
            description="The AI intake and personalized roadmap are part of Polaris Pro. Upgrade to answer a few questions and get your reverse-engineered admissions plan."
          />
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight">
          {t.onboard.title}
        </h1>
        <p className="mt-3 sm:mt-4 text-sm sm:text-base text-ink-dim">{t.onboard.subtitle}</p>

        <form onSubmit={submit} className="mt-10 space-y-8">
          <Question label={t.onboard.q1}>
            <OptionGrid
              options={t.onboard.q1opts as unknown as string[]}
              values={GRADES}
              selected={grade}
              onChange={(v) => setGrade(v as GradeLevel)}
            />
          </Question>

          <Question label={t.onboard.q2}>
            <OptionGrid
              options={t.onboard.q2opts as unknown as string[]}
              values={COUNTRIES}
              selected={country}
              onChange={(v) => setCountry(v as Country)}
              cols={3}
            />
          </Question>

          <Question label={t.onboard.q3}>
            <OptionGrid
              options={t.onboard.q3opts as unknown as string[]}
              values={DEGREES}
              selected={degree}
              onChange={(v) => setDegree(v as Degree)}
            />
          </Question>

          <Question label={t.onboard.q4} hint={t.onboard.q4hint}>
            <div className="glass rounded-2xl p-5 flex items-center gap-5">
              <input
                type="range"
                min="2"
                max="4"
                step="0.05"
                value={gpa}
                onChange={(e) => setGpa(parseFloat(e.target.value))}
                className="flex-1"
              />
              <div className="text-2xl font-serif font-bold text-ink tabular-nums w-16 text-right">
                {gpa.toFixed(2)}
              </div>
            </div>
          </Question>

          <Question label={t.onboard.q5}>
            <OptionGrid
              options={t.onboard.q5opts as unknown as string[]}
              values={ECS}
              selected={ecs}
              multi
              onChange={(v) => toggleEc(v as ECCategory)}
              cols={3}
            />
          </Question>

          <Question label={t.onboard.q6}>
            <OptionGrid
              options={t.onboard.q6opts as unknown as string[]}
              values={TIERS}
              selected={tier}
              onChange={(v) => setTier(v as Tier)}
            />
          </Question>

          {error && (
            <div className="rounded-xl border border-nova-500/40 bg-nova-500/10 px-4 py-3 text-sm text-ink">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "rounded-full px-6 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base font-semibold transition-colors duration-150",
                submitting
                  ? "bg-polaris-200 text-ink-dim cursor-wait"
                  : "bg-polaris-500 text-white hover:bg-polaris-600 active:bg-polaris-700"
              )}
            >
              {submitting ? t.onboard.working : t.onboard.submit}
            </button>
          </div>
        </form>
      </section>
      <Footer />
    </main>
  );
}

function Question({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-ink mb-1.5">{label}</div>
      {hint && <div className="text-xs text-ink-muted mb-3">{hint}</div>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function OptionGrid<T extends string>({
  options,
  values,
  selected,
  multi,
  onChange,
  cols = 2,
}: {
  options: string[];
  values: T[];
  selected: T | T[];
  multi?: boolean;
  onChange: (v: T) => void;
  cols?: 2 | 3;
}) {
  const isSelected = (v: T) =>
    Array.isArray(selected) ? selected.includes(v) : selected === v;

  return (
    <div
      className={cn(
        "grid gap-2",
        cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
      )}
    >
      {options.map((label, i) => {
        const v = values[i];
        const active = isSelected(v);
        return (
          <button
            type="button"
            key={String(v)}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-xl px-4 py-3 text-sm text-left transition-colors duration-150 border",
              active
                ? "bg-polaris-100 border-polaris-400 text-ink"
                : "bg-white border-polaris-200 text-ink-dim hover:border-polaris-300 hover:text-ink"
            )}
            aria-pressed={active}
          >
            <span className="flex items-center justify-between gap-2">
              <span>{label}</span>
              {multi && (
                <span
                  className={cn(
                    "inline-flex h-4 w-4 rounded-md border",
                    active
                      ? "bg-polaris-500 border-polaris-500"
                      : "border-ink-muted/40"
                  )}
                >
                  {active && (
                    <svg viewBox="0 0 24 24" className="text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
