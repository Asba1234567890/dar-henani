"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const roomSchema = z.object({
  name: z.string().min(1),
  roomTypeId: z.string().optional(),
  capacity: z.number().min(1),
  pricePerNight: z.number().min(0),
  description: z.string().optional(),
  amenityIds: z.array(z.string()).default([]),
});

export async function createRoom(raw: z.infer<typeof roomSchema>) {
  const input = roomSchema.parse(raw);
  const room = await prisma.room.create({
    data: {
      name: input.name,
      roomTypeId: input.roomTypeId || undefined,
      capacity: input.capacity,
      pricePerNight: input.pricePerNight,
      description: input.description || undefined,
      amenities: { create: input.amenityIds.map((amenityId) => ({ amenityId })) },
    },
  });
  revalidatePath("/rooms");
  return { ok: true as const, id: room.id };
}

export async function updateRoom(id: string, raw: z.infer<typeof roomSchema>) {
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
      amenities: { create: input.amenityIds.map((amenityId) => ({ amenityId })) },
    },
  });
  revalidatePath("/rooms");
  return { ok: true as const };
}

export async function updateRoomStatus(id: string, status: "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "OUT_OF_SERVICE") {
  await prisma.room.update({ where: { id }, data: { status } });
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
