"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { usePlan, startCheckout } from "@/components/PlanGate";
import { PLAN_LABELS } from "@/lib/features";
import { cn } from "@/lib/cn";

export default function BillingPage() {
  const { plan, loading } = usePlan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upgrade(tier: "pro" | "elite") {
    setError("");
    setBusy(true);
    try {
      await startCheckout(tier);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  async function manage() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Could not open billing portal");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
          Billing & Plan
        </h1>
        <p className="mt-3 text-ink-dim">
          Manage your Polaris subscription and unlock more AI guidance.
        </p>

        {loading ? (
          <p className="mt-10 text-ink-dim">Loading…</p>
        ) : (
          <>
            <div className="mt-8 glass-strong rounded-2xl p-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                  Current plan
                </div>
                <div className="mt-1 text-2xl font-serif font-bold text-ink">
                  Polaris {PLAN_LABELS[plan]}
                </div>
              </div>
              {plan !== "free" && (
                <button
                  onClick={manage}
                  disabled={busy}
                  className="rounded-full border border-polaris-300 bg-white px-5 py-2.5 text-sm font-medium text-ink hover:bg-polaris-50 hover:border-polaris-400 transition-colors duration-150"
                >
                  Manage subscription
                </button>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-nova-500/40 bg-nova-500/10 px-4 py-3 text-sm text-ink">
                {error}
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PlanOption
                label="Pro"
                blurb="AI roadmaps, milestone tracking, benchmarking, full case studies."
                active={plan === "pro"}
                disabled={busy || plan === "pro" || plan === "elite"}
                onClick={() => upgrade("pro")}
              />
              <PlanOption
                label="Elite"
                blurb="Everything in Pro plus adaptive replanning, professor lists, analytics & scenario sims."
                active={plan === "elite"}
                disabled={busy || plan === "elite"}
                onClick={() => upgrade("elite")}
                featured
              />
            </div>
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}

function PlanOption({
  label,
  blurb,
  active,
  disabled,
  onClick,
  featured,
}: {
  label: string;
  blurb: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6 flex flex-col",
        featured
          ? "glass-strong border-2 border-polaris-400/40"
          : "glass border border-polaris-200",
      )}
    >
      <div className="font-semibold text-ink">Polaris {label}</div>
      <p className="mt-1.5 text-sm text-ink-dim flex-1">{blurb}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "mt-4 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-150",
          active
            ? "border border-aurora-400 bg-aurora-500/10 text-aurora-500 cursor-default"
            : disabled
              ? "bg-polaris-200 text-ink-dim cursor-not-allowed"
              : "bg-polaris-500 text-white hover:bg-polaris-600 active:bg-polaris-700",
        )}
      >
        {active ? "Current plan" : `Upgrade to ${label}`}
      </button>
    </div>
  );
}
