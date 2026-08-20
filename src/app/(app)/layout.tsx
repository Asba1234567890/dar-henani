import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "@/components/providers/session-provider";
import { requireUser } from "@/lib/auth/guards";
import { I18nProvider } from "@/lib/i18n/provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: middleware already gates this route group, but every protected
  // page/action must independently verify the session against the database too.
  const user = await requireUser();

  return (
    <SessionProvider user={user}>
      <I18nProvider language={user.language}>
        <div className="flex min-h-screen w-full overflow-x-hidden">
          <Sidebar />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </I18nProvider>
    </SessionProvider>
  );
}
