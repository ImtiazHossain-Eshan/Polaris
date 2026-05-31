"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PLAN_LABELS } from "@/lib/features";
import { cn } from "@/lib/cn";
import type {
  StudentProfile,
  GradeLevel,
  Country,
  Degree,
  ECCategory,
  Tier,
} from "@/lib/profile";

const GRADES: { v: GradeLevel; label: string }[] = [
  { v: "middle", label: "Middle school" },
  { v: "early-hs", label: "Early high school" },
  { v: "late-hs", label: "Late high school" },
  { v: "undergrad", label: "Undergraduate" },
  { v: "recent-grad", label: "Recent graduate" },
];
const COUNTRIES: Country[] = ["Bangladesh", "India", "Pakistan", "Nepal", "Other South Asia", "Other"];
const DEGREES: { v: Degree; label: string }[] = [
  { v: "undergrad", label: "Undergraduate" },
  { v: "masters", label: "Master's" },
  { v: "phd", label: "PhD" },
  { v: "undecided", label: "Undecided" },
];
const ECS: ECCategory[] = ["Olympiads", "Research", "Leadership", "Community", "Sports/Arts", "Internships"];
const TIERS: { v: Tier; label: string }[] = [
  { v: "elite", label: "Top global (Ivy/Oxbridge/MIT)" },
  { v: "top50", label: "Top 50 global" },
  { v: "top200", label: "Strong international (top 200)" },
  { v: "regional", label: "Regional strong programs" },
];

type Account = { name: string; email: string; role: string; plan: "free" | "pro" | "elite" };

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/account").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/profile").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([a, p]) => {
        if (a?.account) setAccount(a.account);
        if (p?.profile) setProfile(p.profile);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
          Your Profile
        </h1>
        <p className="mt-3 text-ink-dim">Manage your account, security, and academic profile.</p>

        {loading ? (
          <p className="mt-10 text-ink-dim">Loading…</p>
        ) : (
          <div className="mt-8 space-y-6">
            {account && <AccountCard account={account} onSaved={(name) => setAccount({ ...account, name })} />}
            <PasswordCard />
            <ProfileCard initial={profile} />
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-strong rounded-2xl p-6">
      <div className="text-sm font-semibold text-ink mb-4">{title}</div>
      {children}
    </div>
  );
}

function Status({ msg, kind }: { msg: string; kind: "ok" | "err" }) {
  if (!msg) return null;
  return (
    <div
      className={cn(
        "mt-3 rounded-xl px-4 py-2.5 text-sm",
        kind === "ok"
          ? "border border-aurora-400/40 bg-aurora-500/10 text-aurora-600"
          : "border border-nova-500/40 bg-nova-500/10 text-ink",
      )}
    >
      {msg}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-polaris-200 bg-white px-4 py-2.5 text-sm text-ink focus:border-polaris-400 focus:outline-none transition-colors";
const btnPrimary =
  "rounded-full bg-polaris-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-polaris-600 active:bg-polaris-700 transition-colors duration-150 disabled:opacity-60 disabled:cursor-wait";

function AccountCard({ account, onSaved }: { account: Account; onSaved: (name: string) => void }) {
  const [name, setName] = useState(account.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<"ok" | "err">("ok");

  async function save() {
    setMsg("");
    setBusy(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      setKind("ok");
      setMsg("Saved.");
      onSaved(name);
    } else {
      const d = await res.json().catch(() => ({}));
      setKind("err");
      setMsg(d.error || "Failed to save");
    }
  }

  return (
    <Card title="Account details">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-ink-muted mb-1.5">Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1.5">Email</label>
          <input value={account.email} disabled className={cn(inputCls, "opacity-60")} />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink-muted">Plan:</span>
          <span className="font-semibold text-ink">Polaris {PLAN_LABELS[account.plan]}</span>
          <Link href="/billing" className="text-polaris-500 hover:text-polaris-600 text-xs">
            Manage →
          </Link>
          {account.role !== "student" && (
            <span className="ml-auto text-xs rounded-full border border-polaris-300 px-2 py-0.5 text-ink-dim capitalize">
              {account.role}
            </span>
          )}
        </div>
        <Status msg={msg} kind={kind} />
        <div className="flex justify-end">
          <button onClick={save} disabled={busy || name === account.name} className={btnPrimary}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<"ok" | "err">("ok");

  async function save() {
    setMsg("");
    setBusy(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setBusy(false);
    if (res.ok) {
      setKind("ok");
      setMsg("Password updated.");
      setCurrent("");
      setNext("");
    } else {
      const d = await res.json().catch(() => ({}));
      setKind("err");
      setMsg(d.error || "Failed to update password");
    }
  }

  return (
    <Card title="Change password">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-ink-muted mb-1.5">Current password</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1.5">New password</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} placeholder="At least 8 characters" />
        </div>
        <Status msg={msg} kind={kind} />
        <div className="flex justify-end">
          <button onClick={save} disabled={busy || !current || next.length < 8} className={btnPrimary}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function ProfileCard({ initial }: { initial: StudentProfile | null }) {
  const [grade, setGrade] = useState<GradeLevel>(initial?.grade ?? "late-hs");
  const [country, setCountry] = useState<Country>(initial?.country ?? "Bangladesh");
  const [degree, setDegree] = useState<Degree>(initial?.degree ?? "undergrad");
  const [gpa, setGpa] = useState(initial?.gpa ?? 3.8);
  const [ecs, setEcs] = useState<ECCategory[]>(initial?.ecs ?? []);
  const [tier, setTier] = useState<Tier>(initial?.targetTier ?? "elite");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<"ok" | "err">("ok");

  function toggleEc(e: ECCategory) {
    setEcs((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]));
  }

  async function save() {
    setMsg("");
    setBusy(true);
    const profile: StudentProfile = { grade, country, degree, gpa, ecs, targetTier: tier };
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    setBusy(false);
    if (res.ok) {
      setKind("ok");
      setMsg("Academic profile saved.");
    } else {
      const d = await res.json().catch(() => ({}));
      setKind("err");
      setMsg(d.error || "Failed to save");
    }
  }

  return (
    <Card title="Academic profile">
      <div className="space-y-4">
        <Select label="Grade level" value={grade} onChange={(v) => setGrade(v as GradeLevel)} options={GRADES.map((g) => ({ v: g.v, label: g.label }))} />
        <Select label="Country" value={country} onChange={(v) => setCountry(v as Country)} options={COUNTRIES.map((c) => ({ v: c, label: c }))} />
        <Select label="Target degree" value={degree} onChange={(v) => setDegree(v as Degree)} options={DEGREES.map((d) => ({ v: d.v, label: d.label }))} />
        <div>
          <label className="block text-xs text-ink-muted mb-1.5">GPA (0–4): <span className="font-semibold text-ink">{gpa.toFixed(2)}</span></label>
          <input type="range" min="2" max="4" step="0.05" value={gpa} onChange={(e) => setGpa(parseFloat(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1.5">Activity categories</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ECS.map((e) => {
              const active = ecs.includes(e);
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEc(e)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs transition-colors duration-150",
                    active ? "bg-polaris-100 border-polaris-400 text-ink" : "bg-white border-polaris-200 text-ink-dim hover:border-polaris-300",
                  )}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </div>
        <Select label="Target tier" value={tier} onChange={(v) => setTier(v as Tier)} options={TIERS.map((t) => ({ v: t.v, label: t.label }))} />
        <Status msg={msg} kind={kind} />
        <div className="flex justify-end">
          <button onClick={save} disabled={busy} className={btnPrimary}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs text-ink-muted mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
