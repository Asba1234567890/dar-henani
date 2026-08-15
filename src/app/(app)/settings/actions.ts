"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const propertySchema = z.object({
  propertyName: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  currency: z.string().min(1),
  checkInTime: z.string(),
  checkOutTime: z.string(),
});

export async function updateProperty(raw: z.infer<typeof propertySchema>) {
  const input = propertySchema.parse(raw);
  await prisma.propertySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...input },
    update: input,
  });
  revalidatePath("/settings");
  return { ok: true as const };
}

const reservationSettingsSchema = z.object({
  cancellationPolicy: z.string().optional(),
  defaultDepositPercent: z.number().min(0).max(100),
});

export async function updateReservationSettings(raw: z.infer<typeof reservationSettingsSchema>) {
  const input = reservationSettingsSchema.parse(raw);
  await prisma.propertySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...input },
    update: input,
  });
  revalidatePath("/settings");
  return { ok: true as const };
}

const systemSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  lowOccupancyAlerts: z.boolean(),
});

export async function updateSystemSettings(raw: z.infer<typeof systemSettingsSchema>) {
  const input = systemSettingsSchema.parse(raw);
  await prisma.propertySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...input },
    update: input,
  });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function addRoomType(name: string, description?: string) {
  if (!name.trim()) return { ok: false as const, error: "Name is required." };
  await prisma.roomType.create({ data: { name: name.trim(), description } });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function deleteRoomType(id: string) {
  await prisma.roomType.delete({ where: { id } }).catch(() => {});
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function addAmenity(name: string) {
  if (!name.trim()) return { ok: false as const, error: "Name is required." };
  await prisma.amenity.create({ data: { name: name.trim() } });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function deleteAmenity(id: string) {
  await prisma.amenity.delete({ where: { id } }).catch(() => {});
  revalidatePath("/settings");
  return { ok: true as const };
}

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
});

export async function createUser(raw: z.infer<typeof userSchema>) {
  const input = userSchema.parse(raw);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return { ok: false as const, error: "A user with this email already exists." };
  await prisma.user.create({ data: input });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function updateUserRole(id: string, role: "ADMIN" | "MANAGER" | "STAFF") {
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function toggleUserActive(id: string, active: boolean) {
  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/settings");
  return { ok: true as const };
}
