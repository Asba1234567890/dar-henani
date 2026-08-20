"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";
import { logAudit } from "@/lib/audit";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export async function changeOwnPassword(raw: z.infer<typeof changePasswordSchema>) {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const dict = getDictionary(auth.user.language);

  let input: z.infer<typeof changePasswordSchema>;
  try {
    input = changePasswordSchema.parse(raw);
  } catch {
    return { ok: false as const, error: dict.profile.passwordTooShort };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user) return { ok: false as const, error: dict.settings.userNotFound };

    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) return { ok: false as const, error: dict.profile.currentPasswordIncorrect };

    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await logAudit(user.id, "PASSWORD_CHANGED_SELF", { targetType: "User", targetId: user.id });
    return { ok: true as const };
  } catch (err) {
    console.error("changeOwnPassword failed:", err);
    return { ok: false as const, error: dict.profile.changePasswordFailed };
  }
}

const languageSchema = z.enum(["EN", "FR"]);

export async function updateOwnLanguage(raw: string) {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const dict = getDictionary(auth.user.language);

  const parsed = languageSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: dict.profile.invalidLanguage };

  try {
    await prisma.user.update({ where: { id: auth.user.id }, data: { language: parsed.data } });
    // Re-sign the session cookie so the new language takes effect immediately, without a re-login.
    const token = await signSession({
      sub: auth.user.id,
      username: auth.user.username,
      name: auth.user.name,
      role: auth.user.role,
      language: parsed.data,
    });
    await setSessionCookie(token);
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (err) {
    console.error("updateOwnLanguage failed:", err);
    return { ok: false as const, error: dict.profile.updateLanguageFailed };
  }
}
