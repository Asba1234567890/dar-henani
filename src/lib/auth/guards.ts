import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSessionCookie } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/session";
import type { UserRole } from "@prisma/client";

export type CurrentUser = {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: UserRole;
  language: "EN" | "FR";
  active: boolean;
};

/** Verifies the session cookie's signature, then re-reads the user from the database
 * so role/active-status changes take effect immediately — never trust the JWT's claims alone. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await readSessionCookie();
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    language: user.language,
    active: user.active,
  };
}

/** For Server Components/pages: redirects to /login when unauthenticated. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For Server Components/pages: redirects non-admins away from admin-only pages. */
export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

type AuthResult = { ok: true; user: CurrentUser } | { ok: false; error: string };

/** For Server Actions and API routes: returns a structured result instead of redirecting,
 * so callers can return `{ ok: false, error }` to the UI. Pass `role` to require ADMIN. */
export async function authorize(role?: UserRole): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in to do this." };
  if (role && user.role !== role) {
    return { ok: false, error: "You do not have permission to perform this action." };
  }
  return { ok: true, user };
}
