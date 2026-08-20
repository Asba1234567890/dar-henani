import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth/guards";
import { UsersManager } from "@/components/settings/users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const currentUser = await requireAdminPage();
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <Topbar title="Users" />
      <PageContainer>
        <UsersManager users={users} currentUserId={currentUser.id} />
      </PageContainer>
    </>
  );
}
