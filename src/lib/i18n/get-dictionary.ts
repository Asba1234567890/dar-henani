import en from "@/lib/i18n/dictionaries/en";
import fr from "@/lib/i18n/dictionaries/fr";
import type { Language } from "@prisma/client";

const DICTIONARIES = { EN: en, FR: fr };

/** Server Components can't use the client I18nProvider context — call this directly instead. */
export function getDictionary(language: Language) {
  return DICTIONARIES[language] ?? en;
}
