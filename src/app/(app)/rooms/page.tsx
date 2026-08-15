import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { listRoomsWithOccupancy } from "@/lib/rooms";
import { getRoomTypes, getAmenities } from "@/lib/catalog";
import { RoomsClient } from "@/components/rooms/rooms-client";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const [rooms, roomTypes, amenities] = await Promise.all([listRoomsWithOccupancy(), getRoomTypes(), getAmenities()]);

  return (
    <>
      <Topbar title="Rooms" />
      <PageContainer>
        <RoomsClient rooms={rooms} roomTypes={roomTypes} amenities={amenities} />
      </PageContainer>
    </>
  );
}
