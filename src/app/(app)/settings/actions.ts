"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

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
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  const input = propertySchema.parse(raw);
  await prisma.propertySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...input },
    update: input,
  });
  await logAudit(auth.user.id, "SETTINGS_UPDATED", { targetType: "PropertySettings", metadata: { section: "property" } });
  revalidatePath("/settings");
  return { ok: true as const };
}

const reservationSettingsSchema = z.object({
  cancellationPolicy: z.string().optional(),
  defaultDepositPercent: z.number().min(0).max(100),
});

export async function updateReservationSettings(raw: z.infer<typeof reservationSettingsSchema>) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  const input = reservationSettingsSchema.parse(raw);
  await prisma.propertySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...input },
    update: input,
  });
  await logAudit(auth.user.id, "SETTINGS_UPDATED", { targetType: "PropertySettings", metadata: { section: "reservations" } });
  revalidatePath("/settings");
  return { ok: true as const };
}

const systemSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  lowOccupancyAlerts: z.boolean(),
});

export async function updateSystemSettings(raw: z.infer<typeof systemSettingsSchema>) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  const input = systemSettingsSchema.parse(raw);
  await prisma.propertySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...input },
    update: input,
  });
  await logAudit(auth.user.id, "SETTINGS_UPDATED", { targetType: "PropertySettings", metadata: { section: "system" } });
  revalidatePath("/settings");
  return { ok: true as const };
}

const notificationSettingsSchema = z.object({
  pushNotificationsEnabled: z.boolean(),
  tomorrowRemindersEnabled: z.boolean(),
  sevenDayRemindersEnabled: z.boolean(),
});

export async function updateNotificationSettings(raw: z.infer<typeof notificationSettingsSchema>) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  const input = notificationSettingsSchema.parse(raw);
  await prisma.propertySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...input },
    update: input,
  });
  await logAudit(auth.user.id, "SETTINGS_UPDATED", { targetType: "PropertySettings", metadata: { section: "notifications" } });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function addRoomType(name: string, description?: string) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  if (!name.trim()) return { ok: false as const, error: "Name is required." };
  await prisma.roomType.create({ data: { name: name.trim(), description } });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function deleteRoomType(id: string) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  try {
    await prisma.roomType.delete({ where: { id } });
  } catch (err) {
    console.error("deleteRoomType failed:", err);
    return { ok: false as const, error: "Could not delete this room type — it may still be assigned to a room." };
  }
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function addAmenity(name: string) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  if (!name.trim()) return { ok: false as const, error: "Name is required." };
  await prisma.amenity.create({ data: { name: name.trim() } });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function deleteAmenity(id: string) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  try {
    await prisma.amenity.delete({ where: { id } });
  } catch (err) {
    console.error("deleteAmenity failed:", err);
    return { ok: false as const, error: "Could not delete this amenity." };
  }
  revalidatePath("/settings");
  return { ok: true as const };
}

const userSchema = z.object({
  name: z.string().min(1),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, dashes and underscores."),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["ADMIN", "USER"]),
  language: z.enum(["EN", "FR"]).default("EN"),
  temporaryPassword: z.string().min(8, "Temporary password must be at least 8 characters."),
});

export async function createUser(raw: z.infer<typeof userSchema>) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;

  let input: z.infer<typeof userSchema>;
  try {
    input = userSchema.parse(raw);
  } catch (err) {
    return { ok: false as const, error: err instanceof z.ZodError ? err.issues[0].message : "Invalid input." };
  }

  try {
    const existingUsername = await prisma.user.findUnique({ where: { username: input.username } });
    if (existingUsername) return { ok: false as const, error: "This username is already taken." };
    if (input.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
      if (existingEmail) return { ok: false as const, error: "A user with this email already exists." };
    }

    const passwordHash = await hashPassword(input.temporaryPassword);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        username: input.username,
        email: input.email || undefined,
        role: input.role,
        language: input.language,
        passwordHash,
      },
    });
    await logAudit(auth.user.id, "USER_CREATED", { targetType: "User", targetId: user.id, metadata: { role: input.role } });
    revalidatePath("/settings/users");
    return { ok: true as const };
  } catch (err) {
    console.error("createUser failed:", err);
    return { ok: false as const, error: "Could not create the user. Please try again." };
  }
}

export async function updateUserRole(id: string, role: "ADMIN" | "USER") {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  if (id === auth.user.id && role !== "ADMIN") {
    return { ok: false as const, error: "You cannot remove your own admin role." };
  }
  await prisma.user.update({ where: { id }, data: { role } });
  await logAudit(auth.user.id, "USER_ROLE_CHANGED", { targetType: "User", targetId: id, metadata: { role } });
  revalidatePath("/settings/users");
  return { ok: true as const };
}

export async function updateUserLanguage(id: string, language: "EN" | "FR") {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  await prisma.user.update({ where: { id }, data: { language } });
  revalidatePath("/settings/users");
  return { ok: true as const };
}

export async function toggleUserActive(id: string, active: boolean) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  if (id === auth.user.id && !active) {
    return { ok: false as const, error: "You cannot deactivate your own account." };
  }
  await prisma.user.update({ where: { id }, data: { active } });
  await logAudit(auth.user.id, active ? "USER_ACTIVATED" : "USER_DEACTIVATED", { targetType: "User", targetId: id });
  revalidatePath("/settings/users");
  return { ok: true as const };
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%";
  let pw = "";
  for (let i = 0; i < 14; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export async function resetUserPassword(id: string) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  const temporaryPassword = generateTempPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  await prisma.user.update({
    where: { id },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });
  await logAudit(auth.user.id, "USER_PASSWORD_RESET", { targetType: "User", targetId: id });
  revalidatePath("/settings/users");
  return { ok: true as const, temporaryPassword };
}
