import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { PropertyForm } from "@/components/settings/property-form";
import { ReservationSettingsForm } from "@/components/settings/reservation-settings-form";
import { TagListManager } from "@/components/settings/tag-list-manager";
import { SystemSettingsForm } from "@/components/settings/system-settings-form";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { addRoomType, deleteRoomType, addAmenity, deleteAmenity } from "@/app/(app)/settings/actions";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAdminPage();
  const dict = getDictionary(user.language);

  const [settings, roomTypes, amenities] = await Promise.all([
    prisma.propertySettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }),
    prisma.roomType.findMany({ orderBy: { name: "asc" } }),
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Topbar title={dict.settings.title} isAdmin />
      <PageContainer>
        <Tabs defaultValue="property">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="property">{dict.settings.property}</TabsTrigger>
            <TabsTrigger value="reservations">{dict.settings.reservationsTab}</TabsTrigger>
            <TabsTrigger value="rooms">{dict.settings.roomsTab}</TabsTrigger>
            <TabsTrigger value="users">{dict.settings.users}</TabsTrigger>
            <TabsTrigger value="notifications">{dict.settings.notifications}</TabsTrigger>
            <TabsTrigger value="system">{dict.settings.system}</TabsTrigger>
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
            <TagListManager title={dict.settings.roomTypes} items={roomTypes} onAdd={addRoomType} onDelete={deleteRoomType} placeholder={dict.settings.roomTypePlaceholder} />
            <TagListManager title={dict.rooms.amenities} items={amenities} onAdd={addAmenity} onDelete={deleteAmenity} placeholder={dict.settings.amenityPlaceholder} />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle>{dict.settings.usersAndPermissions}</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-text-secondary">{dict.settings.manageUsersDesc}</p>
                <Button asChild>
                  <Link href="/settings/users">
                    {dict.settings.openUserManagement} <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettingsForm
              initial={{
                pushNotificationsEnabled: settings.pushNotificationsEnabled,
                tomorrowRemindersEnabled: settings.tomorrowRemindersEnabled,
                sevenDayRemindersEnabled: settings.sevenDayRemindersEnabled,
              }}
            />
          </TabsContent>

          <TabsContent value="system">
            <SystemSettingsForm initial={{ emailNotifications: settings.emailNotifications, lowOccupancyAlerts: settings.lowOccupancyAlerts }} />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}
