"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { strings, type Lang, type Dict } from "./strings";

type LangContext = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
};

const Ctx = createContext<LangContext | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("polaris.lang");
      if (stored === "en" || stored === "bn") setLangState(stored);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("polaris.lang", l);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, []);

  const value: LangContext = {
    lang,
    setLang,
    t: strings[lang],
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
