import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, signSession, verifySession } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/manifest.json", "/sw.js", "/favicon.ico", "/offline.html"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/icons/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/api/cron/")) return true; // authenticated separately via CRON_SECRET
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    // Signed-in users shouldn't see the login screen again.
    if (pathname === "/login") {
      const token = req.cookies.get(SESSION_COOKIE)?.value;
      const session = token ? await verifySession(token) : null;
      if (session) return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Rolling session: re-issue the cookie with a fresh expiry on each authenticated request
  // an active admin is making, without requiring a DB round-trip inside Edge middleware.
  const response = NextResponse.next();
  const refreshed = await signSession(session);
  response.cookies.set(SESSION_COOKIE, refreshed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
