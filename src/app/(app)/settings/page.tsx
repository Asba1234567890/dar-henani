import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";
import { PropertyForm } from "@/components/settings/property-form";
import { ReservationSettingsForm } from "@/components/settings/reservation-settings-form";
import { TagListManager } from "@/components/settings/tag-list-manager";
import { UsersManager } from "@/components/settings/users-manager";
import { SystemSettingsForm } from "@/components/settings/system-settings-form";
import { addRoomType, deleteRoomType, addAmenity, deleteAmenity } from "@/app/(app)/settings/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, roomTypes, amenities, users] = await Promise.all([
    prisma.propertySettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }),
    prisma.roomType.findMany({ orderBy: { name: "asc" } }),
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Topbar title="Settings" />
      <PageContainer>
        <Tabs defaultValue="property">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="property">
            <PropertyForm
              initial={{
                propertyName: settings.propertyName,
                address: settings.address ?? "",
                phone: settings.phone ?? "",
                email: settings.email ?? "",
                currency: settings.currency,
                checkInTime: settings.checkInTime,
                checkOutTime: settings.checkOutTime,
              }}
            />
          </TabsContent>

          <TabsContent value="reservations">
            <ReservationSettingsForm
              initial={{ cancellationPolicy: settings.cancellationPolicy ?? "", defaultDepositPercent: settings.defaultDepositPercent }}
            />
          </TabsContent>

          <TabsContent value="rooms" className="space-y-6">
            <TagListManager title="Room types" items={roomTypes} onAdd={addRoomType} onDelete={deleteRoomType} placeholder="e.g. Suite" />
            <TagListManager title="Amenities" items={amenities} onAdd={addAmenity} onDelete={deleteAmenity} placeholder="e.g. WiFi" />
          </TabsContent>

          <TabsContent value="users">
            <UsersManager users={users} />
          </TabsContent>

          <TabsContent value="system">
            <SystemSettingsForm initial={{ emailNotifications: settings.emailNotifications, lowOccupancyAlerts: settings.lowOccupancyAlerts }} />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}
