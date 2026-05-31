"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useLang } from "@/lib/i18n/LangProvider";
import { PLAN_LABELS } from "@/lib/features";
import { cn } from "@/lib/cn";

type NavLink = { href: string; label: string; accent?: boolean };

export function Nav() {
  const { t, lang, setLang } = useLang();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  const role = session?.user?.role ?? "student";
  const plan = session?.user?.plan ?? "free";
  const isViewer = role === "parent" || role === "partner";

  const links: NavLink[] = [
    { href: "/#how", label: t.nav.howItWorks },
    { href: "/#pricing", label: t.nav.pricing },
    { href: "/case-studies", label: "Case studies" },
    ...(session && !isViewer
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/family", label: "Family" },
        ]
      : []),
    ...(session && isViewer ? [{ href: "/monitor", label: "Monitor" }] : []),
    ...(role === "admin" ? [{ href: "/admin", label: "Admin", accent: true }] : []),
  ];

  const LangToggle = (
    <div className="rounded-full border border-polaris-200 bg-white p-0.5 text-xs flex">
      <button
        onClick={() => setLang("en")}
        className={cn(
          "px-3 py-1 rounded-full transition-colors duration-150",
          lang === "en" ? "bg-polaris-100 text-ink font-medium" : "text-ink-dim hover:text-ink",
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLang("bn")}
        className={cn(
          "px-3 py-1 rounded-full transition-colors duration-150",
          lang === "bn" ? "bg-polaris-100 text-ink font-medium" : "text-ink-dim hover:text-ink",
        )}
      >
        বাংলা
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass-strong mx-auto mt-4 flex w-[min(1100px,calc(100%-2rem))] items-center justify-between gap-3 rounded-2xl px-4 sm:px-5 py-3 shadow-sm">
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <CompassLogo />
          <span className="font-serif font-bold tracking-tight text-ink">Polaris</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden xl:flex items-center gap-5 text-sm text-ink-dim">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "whitespace-nowrap transition",
                l.accent
                  ? "font-medium text-nova-500 hover:text-nova-600"
                  : "hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right controls */}
        <div className="hidden xl:flex items-center gap-2 shrink-0">
          {LangToggle}
          {status === "loading" ? (
            <div className="h-9 w-24" />
          ) : session ? (
            <>
              <Link
                href="/account"
                className="flex items-center gap-1.5 rounded-full border border-polaris-200 bg-white px-3 py-1.5 text-sm hover:border-polaris-400 transition-colors duration-150"
                title="Your profile & account"
              >
                <UserIcon />
                <span className="text-ink-dim max-w-[100px] truncate">
                  {session.user?.name || session.user?.email}
                </span>
                <PlanBadge plan={plan} />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="whitespace-nowrap rounded-full border border-polaris-300 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-polaris-50 hover:border-polaris-400 transition-colors duration-150"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="whitespace-nowrap rounded-full border border-polaris-300 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-polaris-50 hover:border-polaris-400 transition-colors duration-150"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-polaris-500 px-4 py-2 text-sm font-medium text-white hover:bg-polaris-600 active:bg-polaris-700 transition-colors duration-150"
              >
                Sign up
                <ArrowRight />
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="xl:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-polaris-200 bg-white text-ink"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="xl:hidden mx-auto mt-2 w-[min(1100px,calc(100%-2rem))] glass-strong rounded-2xl p-4 shadow-sm">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm transition-colors",
                  l.accent
                    ? "font-medium text-nova-500 hover:bg-nova-500/10"
                    : "text-ink-dim hover:bg-polaris-50 hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mt-3 pt-3 border-t border-polaris-500/15 flex flex-col gap-3">
            {LangToggle}
            {status === "loading" ? null : session ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-polaris-200 bg-white px-3 py-2.5 text-sm"
                >
                  <UserIcon />
                  <span className="text-ink-dim flex-1 truncate">
                    {session.user?.name || session.user?.email}
                  </span>
                  <PlanBadge plan={plan} />
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-full border border-polaris-300 bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-polaris-50 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/signin"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-polaris-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-ink hover:bg-polaris-50 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-polaris-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-polaris-600 transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function CompassLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center shrink-0",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
        <circle cx="16" cy="16" r="14" stroke="#8B5E3C" strokeWidth="1.5" opacity="0.4" />
        <circle cx="16" cy="16" r="11" stroke="#C47D4E" strokeWidth="0.75" opacity="0.3" />
        <line x1="16" y1="3" x2="16" y2="29" stroke="#8B5E3C" strokeWidth="0.5" opacity="0.2" />
        <line x1="3" y1="16" x2="29" y2="16" stroke="#8B5E3C" strokeWidth="0.5" opacity="0.2" />
        <polygon points="16,4 18.5,14 16,12.5 13.5,14" fill="#8B5E3C" />
        <polygon points="16,28 18.5,18 16,19.5 13.5,18" fill="#C47D4E" opacity="0.5" />
        <polygon points="28,16 18,13.5 19.5,16 18,18.5" fill="#C47D4E" opacity="0.5" />
        <polygon points="4,16 14,13.5 12.5,16 14,18.5" fill="#C47D4E" opacity="0.5" />
        <circle cx="16" cy="16" r="2" fill="#8B5E3C" />
        <circle cx="16" cy="16" r="1" fill="#FAF6F0" />
      </svg>
    </span>
  );
}

export const StarLogo = CompassLogo;

function PlanBadge({ plan }: { plan: "free" | "pro" | "elite" }) {
  const style = {
    free: "bg-polaris-100 text-ink-dim border-polaris-200",
    pro: "bg-polaris-500/15 text-polaris-600 border-polaris-400/40",
    elite: "bg-aurora-500/15 text-aurora-500 border-aurora-400/40",
  }[plan];
  return (
    <span
      className={cn(
        "shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded-full border px-1.5 py-0.5",
        style,
      )}
    >
      {PLAN_LABELS[plan]}
    </span>
  );
}

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
