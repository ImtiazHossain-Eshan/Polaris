"use client";

import { useLang } from "@/lib/i18n/LangProvider";

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="mt-24 border-t border-polaris-500/15 py-10">
      <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-ink-muted">
        <div className="text-gradient font-serif font-bold">{t.footer.tagline}</div>
        <div>{t.footer.built}</div>
      </div>
    </footer>
  );
}
