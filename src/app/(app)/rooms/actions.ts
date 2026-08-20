"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";

const roomSchema = z.object({
  name: z.string().min(1),
  roomTypeId: z.string().optional(),
  capacity: z.number().min(1),
  pricePerNight: z.number().min(0),
  description: z.string().optional(),
  amenityIds: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
});

export async function createRoom(raw: z.infer<typeof roomSchema>) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;

  try {
    const input = roomSchema.parse(raw);
    const room = await prisma.room.create({
      data: {
        name: input.name,
        roomTypeId: input.roomTypeId || undefined,
        capacity: input.capacity,
        pricePerNight: input.pricePerNight,
        description: input.description || undefined,
        photos: input.photos.length > 0 ? JSON.stringify(input.photos) : undefined,
        amenities: { create: input.amenityIds.map((amenityId) => ({ amenityId })) },
      },
    });
    await logAudit(auth.user.id, "ROOM_CREATED", { targetType: "Room", targetId: room.id });
    revalidatePath("/rooms");
    return { ok: true as const, id: room.id };
  } catch (err) {
    console.error("createRoom failed:", err);
    return { ok: false as const, error: "Could not create the room. Please try again." };
  }
}

export async function updateRoom(id: string, raw: z.infer<typeof roomSchema>) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;

  try {
    const input = roomSchema.parse(raw);
    await prisma.roomAmenity.deleteMany({ where: { roomId: id } });
    await prisma.room.update({
      where: { id },
      data: {
        name: input.name,
        roomTypeId: input.roomTypeId || undefined,
        capacity: input.capacity,
        pricePerNight: input.pricePerNight,
        description: input.description || undefined,
        photos: input.photos.length > 0 ? JSON.stringify(input.photos) : null,
        amenities: { create: input.amenityIds.map((amenityId) => ({ amenityId })) },
      },
    });
    await logAudit(auth.user.id, "ROOM_UPDATED", { targetType: "Room", targetId: id });
    revalidatePath("/rooms");
    return { ok: true as const };
  } catch (err) {
    console.error("updateRoom failed:", err);
    return { ok: false as const, error: "Could not update the room. Please try again." };
  }
}

export async function updateRoomStatus(id: string, status: "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "OUT_OF_SERVICE") {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;

  try {
    await prisma.room.update({ where: { id }, data: { status } });
    revalidatePath("/rooms");
    revalidatePath("/dashboard");
    return { ok: true as const };
  } catch (err) {
    console.error("updateRoomStatus failed:", err);
    return { ok: false as const, error: "Could not update the room status. Please try again." };
  }
}
