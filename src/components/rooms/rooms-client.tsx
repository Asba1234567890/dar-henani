"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Users, Pencil, Plus, BedDouble, Images } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { roomStatusLabel, roomStatusVariant } from "@/lib/status";
import { updateRoomStatus } from "@/app/(app)/rooms/actions";
import { RoomFormDialog, type RoomFormValue } from "@/components/rooms/room-form-dialog";
import { RoomGalleryDialog } from "@/components/rooms/room-gallery-dialog";
import { useI18n } from "@/lib/i18n/provider";
import type { RoomStatus } from "@prisma/client";
import type { listRoomsWithOccupancy } from "@/lib/rooms";

type RoomCard = Awaited<ReturnType<typeof listRoomsWithOccupancy>>[number];

function parsePhotos(photos: string | null): string[] {
  if (!photos) return [];
  try {
    const parsed = JSON.parse(photos);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const STATUS_OPTIONS: RoomStatus[] = ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE", "OUT_OF_SERVICE"];

export function RoomsClient({
  rooms,
  roomTypes,
  amenities,
  canManage,
}: {
  rooms: RoomCard[];
  roomTypes: { id: string; name: string }[];
  amenities: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { t, dict } = useI18n();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoomFormValue | undefined>(undefined);
  const [galleryRoom, setGalleryRoom] = useState<RoomCard | null>(null);
  const [, startTransition] = useTransition();

  function openAdd() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(room: RoomCard) {
    setEditing({
      id: room.id,
      name: room.name,
      roomTypeId: room.roomType?.id ?? "",
      capacity: room.capacity,
      pricePerNight: room.pricePerNight,
      description: room.description ?? "",
      amenityIds: room.amenities.map((a) => a.amenity.id),
      photos: parsePhotos(room.photos),
    });
    setFormOpen(true);
  }

  function changeStatus(id: string, status: RoomStatus) {
    startTransition(async () => {
      const result = await updateRoomStatus(id, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("rooms.roomStatusUpdated"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openAdd}><Plus className="h-4 w-4" /> {t("rooms.addRoom")}</Button>
        </div>
      )}

      {rooms.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title={t("rooms.noRoomsYet")}
          description={t("rooms.noRoomsYetDesc")}
          action={canManage ? <Button onClick={openAdd}>{t("rooms.addRoom")}</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const photos = parsePhotos(room.photos);
            return (
            <Card key={room.id} className="flex flex-col overflow-hidden">
              {photos.length > 0 && (
                <button
                  onClick={() => setGalleryRoom(room)}
                  className="group relative aspect-video w-full overflow-hidden bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photos[0]}
                    alt={room.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {photos.length > 1 && (
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                      <Images className="h-3 w-3" /> {photos.length}
                    </span>
                  )}
                </button>
              )}
              <div className="flex items-start justify-between gap-3 p-5 pb-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-medium text-text-primary">{room.name}</p>
                  <p className="text-xs text-text-secondary">{room.roomType?.name ?? t("rooms.room")}</p>
                </div>
                <Badge variant={roomStatusVariant[room.status]}>{roomStatusLabel(dict, room.status)}</Badge>
              </div>
              <div className="flex-1 space-y-3 px-5 pb-3 text-sm">
                <div className="flex items-center gap-4 text-text-secondary">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {room.capacity} {t("rooms.guestsCount")}</span>
                  <span className="font-medium text-primary">{formatCurrency(room.pricePerNight)}{t("rooms.perNight")}</span>
                </div>
                {room.description && <p className="line-clamp-2 text-text-secondary">{room.description}</p>}
                {room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 4).map(({ amenity }) => (
                      <Badge key={amenity.id} variant="outline">{amenity.name}</Badge>
                    ))}
                    {room.amenities.length > 4 && <Badge variant="outline">+{room.amenities.length - 4}</Badge>}
                  </div>
                )}
                {room.currentReservation && (
                  <div className="rounded-[var(--radius-sm)] bg-info-bg px-3 py-2 text-xs text-info">
                    <Link href={`/reservations/${room.currentReservation.id}`} className="font-medium hover:underline">
                      {room.currentReservation.guest.firstName} {room.currentReservation.guest.lastName}
                    </Link>{" "}
                    {t("rooms.until")} {new Date(room.currentReservation.checkOut!).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </div>
                )}
              </div>
              {canManage && (
                <div className="flex items-center gap-2 border-t border-border p-3">
                  <Select
                    className="h-9 flex-1 text-xs"
                    value={room.status}
                    onChange={(e) => changeStatus(room.id, e.target.value as RoomStatus)}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{roomStatusLabel(dict, s)}</option>)}
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => openEdit(room)} aria-label={t("rooms.editRoom")}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </Card>
            );
          })}
        </div>
      )}

      {canManage && <RoomFormDialog open={formOpen} onOpenChange={setFormOpen} roomTypes={roomTypes} amenities={amenities} initial={editing} />}
      {galleryRoom && (
        <RoomGalleryDialog
          open={!!galleryRoom}
          onOpenChange={(v) => !v && setGalleryRoom(null)}
          photos={parsePhotos(galleryRoom.photos)}
          roomName={galleryRoom.name}
        />
      )}
    </div>
  );
}
