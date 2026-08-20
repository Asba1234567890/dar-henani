import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Language } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function localeFor(language?: Language) {
  return language === "FR" ? "fr-FR" : "en-GB";
}

export function formatCurrency(amount: number, currency = "TND", language?: Language) {
  return new Intl.NumberFormat(language === "FR" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(currency, `${currency} `)
    .trim();
}

export function formatDate(date: Date | string, opts: Intl.DateTimeFormatOptions = {}, language?: Language) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(localeFor(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(d);
}
