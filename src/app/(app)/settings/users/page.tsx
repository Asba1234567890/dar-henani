import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth/guards";
import { UsersManager } from "@/components/settings/users-manager";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const currentUser = await requireAdminPage();
  const dict = getDictionary(currentUser.language);
  // Never select passwordHash (or lockout internals) here — this list is serialized
  // straight into the client component's props and would ship bcrypt hashes to the browser.
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, username: true, email: true, role: true, language: true, active: true, createdAt: true, lastLoginAt: true },
  });

  return (
    <>
      <Topbar title={dict.settings.users} />
      <PageContainer>
        <UsersManager users={users} currentUserId={currentUser.id} />
      </PageContainer>
    </>
  );
}
