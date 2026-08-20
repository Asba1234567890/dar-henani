"use client";

import { createContext, useContext } from "react";
import type { UserRole, Language } from "@prisma/client";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
  language: Language;
};

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
