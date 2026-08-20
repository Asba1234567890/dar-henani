import { SignJWT, jwtVerify } from "jose";
import type { UserRole, Language } from "@prisma/client";

export const SESSION_COOKIE = "dh_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type SessionPayload = {
  sub: string;
  username: string;
  name: string;
  role: UserRole;
  language: Language;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Set it in your environment before starting the app.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.language !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      username: payload.username,
      name: payload.name,
      role: payload.role as UserRole,
      language: payload.language as Language,
    };
  } catch {
    return null;
  }
}
