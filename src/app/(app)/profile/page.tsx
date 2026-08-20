import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { ProfileForm } from "@/components/settings/profile-form";
import { requireUser } from "@/lib/auth/guards";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const dict = getDictionary(user.language);

  return (
    <>
      <Topbar title={dict.profile.title} />
      <PageContainer>
        <ProfileForm user={user} />
      </PageContainer>
    </>
  );
}
