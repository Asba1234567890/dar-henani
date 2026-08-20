"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";
import { logAudit } from "@/lib/audit";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const GENERIC_ERROR = "Invalid username or password.";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required."),
  password: z.string().min(1, "Password is required."),
});

export async function login(raw: { identifier: string; password: string }) {
  let input: z.infer<typeof loginSchema>;
  try {
    input = loginSchema.parse(raw);
  } catch {
    return { ok: false as const, error: GENERIC_ERROR };
  }

  const identifier = input.identifier.trim();

  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    });

    if (!user) {
      return { ok: false as const, error: GENERIC_ERROR };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000));
      return {
        ok: false as const,
        error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`,
      };
    }

    if (!user.active) {
      return { ok: false as const, error: "This account has been disabled. Contact your administrator." };
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60000) : null;
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: lockedUntil ? 0 : attempts, lockedUntil },
      });
      await logAudit(user.id, "LOGIN_FAILED", { targetType: "User", targetId: user.id });
      return { ok: false as const, error: GENERIC_ERROR };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const token = await signSession({
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      language: user.language,
    });
    await setSessionCookie(token);
    await logAudit(user.id, "LOGIN_SUCCESS", { targetType: "User", targetId: user.id });
  } catch (err) {
    console.error("login failed:", err);
    return { ok: false as const, error: "Something went wrong. Please try again." };
  }

  redirect("/dashboard");
}
