"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { login } from "@/app/(auth)/login/actions";
import { useI18n } from "@/lib/i18n/provider";

export function LoginBrandTagline() {
  const { t } = useI18n();
  return <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("nav.tagline")}</p>;
}

export function LoginForm() {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await login({ identifier, password });
        if (result && !result.ok) {
          setError(result.error);
        }
        // On success the action redirects server-side; nothing else to do here.
      } catch (err) {
        // Next.js redirect() throws an internal signal on success — let it propagate untouched.
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setError(t("common.somethingWentWrong"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <FieldGroup>
        <Label htmlFor="identifier">{t("login.identifier")}</Label>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={pending}
          required
        />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="password">{t("login.password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          required
        />
      </FieldGroup>

      {error && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending || !identifier || !password}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? t("login.signingIn") : t("login.submit")}
      </Button>
    </form>
  );
}
