"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth/guards";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function markNotificationRead(id: string) {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const dict = getDictionary(auth.user.language);
  try {
    // updateMany scopes the write to the current user, so one user can never mark another's notification read.
    await prisma.notification.updateMany({ where: { id, userId: auth.user.id }, data: { read: true } });
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (err) {
    console.error("markNotificationRead failed:", err);
    return { ok: false as const, error: dict.notifications.updateNotificationFailed };
  }
}

export async function markAllNotificationsRead() {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const dict = getDictionary(auth.user.language);
  try {
    await prisma.notification.updateMany({ where: { userId: auth.user.id, read: false }, data: { read: true } });
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (err) {
    console.error("markAllNotificationsRead failed:", err);
    return { ok: false as const, error: dict.notifications.updateNotificationsFailed };
  }
}
