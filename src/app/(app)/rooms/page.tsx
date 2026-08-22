import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { listRoomsWithOccupancy } from "@/lib/rooms";
import { getRoomTypes, getAmenities } from "@/lib/catalog";
import { RoomsClient } from "@/components/rooms/rooms-client";
import { requireUser } from "@/lib/auth/guards";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const user = await requireUser();
  const dict = getDictionary(user.language);
  const [rooms, roomTypes, amenities] = await Promise.all([listRoomsWithOccupancy(), getRoomTypes(), getAmenities()]);

  return (
    <>
      <Topbar title={dict.rooms.title} isAdmin={user.role === "ADMIN"} />
      <PageContainer>
        <RoomsClient rooms={rooms} roomTypes={roomTypes} amenities={amenities} canManage={user.role === "ADMIN"} />
      </PageContainer>
    </>
  );
}
