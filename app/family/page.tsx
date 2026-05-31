"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/cn";

type Link = {
  viewerEmail: string;
  relationship: "parent" | "partner";
  status: "pending" | "accepted";
  inviteToken: string;
};

export default function FamilyPage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "student";
  const [links, setLinks] = useState<Link[]>([]);
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState<"parent" | "partner">("parent");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Parent/partner-side: accept an invite via token
  const [acceptToken, setAcceptToken] = useState("");
  const [acceptMsg, setAcceptMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/links");
    if (res.ok) {
      const d = await res.json();
      setLinks(d.links ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    // Pre-fill the accept token if arriving from an invite link.
    const params = new URLSearchParams(window.location.search);
    const token = params.get("accept");
    if (token) setAcceptToken(token);
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ viewerEmail: email, relationship }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to send invite");
      }
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setAcceptMsg("");
    const res = await fetch("/api/links/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: acceptToken.trim() }),
    });
    if (res.ok) {
      setAcceptMsg("Linked! You can now monitor this student from /monitor.");
      setAcceptToken("");
    } else {
      const d = await res.json().catch(() => ({}));
      setAcceptMsg(d.error || "Could not accept invite");
    }
  }

  function inviteLink(token: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/family?accept=${token}`;
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
          Family & Partners
        </h1>
        <p className="mt-3 text-ink-dim">
          Invite a parent or partner to follow your progress (read-only), or
          accept an invite to monitor someone.
        </p>

        {/* Invite (student side) */}
        <div className="mt-8 glass-strong rounded-2xl p-6">
          <div className="text-sm font-semibold text-ink mb-4">
            Invite someone to monitor your progress
          </div>
          <form onSubmit={invite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="their@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-xl border border-polaris-200 bg-white px-4 py-2.5 text-sm focus:border-polaris-400 focus:outline-none"
            />
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as "parent" | "partner")}
              className="rounded-xl border border-polaris-200 bg-white px-4 py-2.5 text-sm focus:border-polaris-400 focus:outline-none"
            >
              <option value="parent">Parent</option>
              <option value="partner">Partner</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-150",
                busy
                  ? "bg-polaris-200 text-ink-dim cursor-wait"
                  : "bg-polaris-500 text-white hover:bg-polaris-600 active:bg-polaris-700",
              )}
            >
              Invite
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-nova-500">{error}</p>}

          {links.length > 0 && (
            <ul className="mt-5 space-y-2">
              {links.map((l) => (
                <li
                  key={l.inviteToken}
                  className="flex flex-col gap-1 rounded-xl border border-polaris-200 bg-white px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-ink">{l.viewerEmail}</span>
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 border",
                        l.status === "accepted"
                          ? "bg-aurora-500/15 text-aurora-500 border-aurora-400/40"
                          : "bg-polaris-100 text-ink-dim border-polaris-200",
                      )}
                    >
                      {l.relationship} · {l.status}
                    </span>
                  </div>
                  {l.status === "pending" && (
                    <div className="text-xs text-ink-muted break-all">
                      Share this invite link: {inviteLink(l.inviteToken)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Accept (parent/partner side) */}
        <div className="mt-6 glass rounded-2xl p-6">
          <div className="text-sm font-semibold text-ink mb-2">
            Accept an invite
          </div>
          <p className="text-xs text-ink-muted mb-4">
            Paste an invite token (or the part after <code>?accept=</code> in
            your invite link){role !== "student" ? "" : " — you'll need to be signed in with the invited email"}.
          </p>
          <form onSubmit={accept} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              placeholder="invite token"
              value={acceptToken}
              onChange={(e) => setAcceptToken(e.target.value)}
              className="flex-1 rounded-xl border border-polaris-200 bg-white px-4 py-2.5 text-sm focus:border-polaris-400 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full border border-polaris-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-polaris-50 hover:border-polaris-400 transition-colors duration-150"
            >
              Accept
            </button>
          </form>
          {acceptMsg && <p className="mt-3 text-sm text-ink-dim">{acceptMsg}</p>}
        </div>
      </section>
      <Footer />
    </main>
  );
}
