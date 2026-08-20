import type { Metadata } from "next";
import { LoginForm, LoginBrandTagline } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in — Dar Henani PMS" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm rounded-[var(--radius-md)] border border-border bg-surface p-8 shadow-[var(--shadow-lg)]">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg">
          DH
        </div>
        <div>
          <p className="font-display text-xl text-text-primary">Dar Henani</p>
          <LoginBrandTagline />
        </div>
      </div>
      <LoginForm />
    </div>
  );
}
