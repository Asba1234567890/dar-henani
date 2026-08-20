import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { ProfileForm } from "@/components/settings/profile-form";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <Topbar title="My profile" />
      <PageContainer>
        <ProfileForm user={user} />
      </PageContainer>
    </>
  );
}
