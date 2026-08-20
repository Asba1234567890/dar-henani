"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { getCurrentUser } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";

export async function logout() {
  const user = await getCurrentUser();
  await clearSessionCookie();
  if (user) await logAudit(user.id, "LOGOUT", { targetType: "User", targetId: user.id });
  redirect("/login");
}
