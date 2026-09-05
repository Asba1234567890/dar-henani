"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import en from "@/lib/i18n/dictionaries/en";
import fr from "@/lib/i18n/dictionaries/fr";
import type { Language } from "@prisma/client";

type Dictionary = typeof en;
const DICTIONARIES: Record<Language, Dictionary> = { EN: en, FR: fr };

type I18nContextValue = {
  language: Language;
  dict: Dictionary;
  t: (path: string, vars?: Record<string, string | number>) => string;
  setLanguage: (lang: Language) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolve(dict: Dictionary, path: string): string | undefined {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = dict;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function I18nProvider({
  language: initialLanguage,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const dict = DICTIONARIES[language] ?? en;
      let value = resolve(dict, path) ?? resolve(en, path) ?? path;
      if (vars) {
        for (const [key, val] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
        }
      }
      return value;
    },
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, dict: DICTIONARIES[language] ?? en, t, setLanguage: setLanguageState }),
    [language, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
