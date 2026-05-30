"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useLang } from "@/lib/i18n/LangProvider";
import { cn } from "@/lib/cn";

export function Nav() {
  const { t, lang, setLang } = useLang();
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass-strong mx-auto mt-4 flex w-[min(1100px,calc(100%-2rem))] items-center justify-between rounded-2xl px-5 py-3 shadow-sm">
        <Link href="/" className="flex items-center gap-2 group">
          <CompassLogo />
          <span className="font-serif font-bold tracking-tight text-ink">Polaris</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-ink-dim">
          <a href="/#how" className="hover:text-ink transition">{t.nav.howItWorks}</a>
          <a href="/#pricing" className="hover:text-ink transition">{t.nav.pricing}</a>
          <Link href="/dashboard" className="hover:text-ink transition">Dashboard</Link>
        </nav>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-polaris-200 bg-white p-0.5 text-xs flex">
            <button
              onClick={() => setLang("en")}
              className={cn(
                "px-3 py-1 rounded-full transition-colors duration-150",
                lang === "en" ? "bg-polaris-100 text-ink font-medium" : "text-ink-dim hover:text-ink"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLang("bn")}
              className={cn(
                "px-3 py-1 rounded-full transition-colors duration-150",
                lang === "bn" ? "bg-polaris-100 text-ink font-medium" : "text-ink-dim hover:text-ink"
              )}
            >
              বাংলা
            </button>
          </div>

          {status === "loading" ? (
            <div className="h-9 w-20" />
          ) : session ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-polaris-200 bg-white px-3 py-1.5 text-sm">
                <UserIcon />
                <span className="text-ink-dim max-w-[120px] truncate">
                  {session.user?.name || session.user?.email}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border border-polaris-300 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-polaris-50 hover:border-polaris-400 transition-colors duration-150"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/signin"
                className="hidden sm:inline-flex rounded-full border border-polaris-300 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-polaris-50 hover:border-polaris-400 transition-colors duration-150"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-full bg-polaris-500 px-4 py-2 text-sm font-medium text-white hover:bg-polaris-600 active:bg-polaris-700 transition-colors duration-150"
              >
                Sign up
                <ArrowRight />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function CompassLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center",
        className
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

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
