import { headers } from "next/headers";
import { I18nProvider } from "@/lib/i18n/provider";
import type { Language } from "@prisma/client";

/** No signed-in user yet on /login, so there's no stored language preference —
 * fall back to the browser's Accept-Language header instead of hardcoding English. */
async function detectLanguage(): Promise<Language> {
  const headerList = await headers();
  const acceptLanguage = headerList.get("accept-language") ?? "";
  return acceptLanguage.toLowerCase().startsWith("fr") ? "FR" : "EN";
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const language = await detectLanguage();
  return (
    <I18nProvider language={language}>
      <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
        {children}
      </div>
    </I18nProvider>
  );
}
