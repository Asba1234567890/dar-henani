"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldGroup } from "@/components/ui/input";
import { changeOwnPassword, updateOwnLanguage } from "@/app/(app)/profile/actions";
import { useI18n } from "@/lib/i18n/provider";
import type { SessionUser } from "@/components/providers/session-provider";

export function ProfileForm({ user }: { user: SessionUser }) {
  const { t, setLanguage } = useI18n();
  const [pendingPassword, startPasswordTransition] = useTransition();
  const [pendingLanguage, startLanguageTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [language, setLanguageValue] = useState(user.language);

  function submitPassword() {
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.passwordMismatch"));
      return;
    }
    startPasswordTransition(async () => {
      const result = await changeOwnPassword({ currentPassword, newPassword });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("profile.passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  function changeLanguage(lang: "EN" | "FR") {
    setLanguageValue(lang);
    startLanguageTransition(async () => {
      const result = await updateOwnLanguage(lang);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLanguage(lang);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-text-secondary">{t("settings.username")}</p>
              <p className="font-medium">{user.username}</p>
            </div>
            {user.email && (
              <div>
                <p className="text-xs text-text-secondary">{t("settings.email")}</p>
                <p className="font-medium">{user.email}</p>
              </div>
            )}
          </div>
          <FieldGroup className="max-w-xs">
            <Label>{t("common.language")}</Label>
            <Select value={language} onChange={(e) => changeLanguage(e.target.value as "EN" | "FR")} disabled={pendingLanguage}>
              <option value="EN">{t("common.english")}</option>
              <option value="FR">{t("common.french")}</option>
            </Select>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.changePassword")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup>
            <Label>{t("profile.currentPassword")}</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("profile.newPassword")}</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("profile.confirmPassword")}</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </FieldGroup>
          <Button
            onClick={submitPassword}
            disabled={pendingPassword || !currentPassword || newPassword.length < 8}
          >
            {pendingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
