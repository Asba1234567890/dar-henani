"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateSystemSettings } from "@/app/(app)/settings/actions";
import { useI18n } from "@/lib/i18n/provider";

export function SystemSettingsForm({ initial }: { initial: { emailNotifications: boolean; lowOccupancyAlerts: boolean } }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();

  function update(patch: Partial<typeof value>) {
    const next = { ...value, ...patch };
    setValue(next);
    startTransition(async () => {
      const result = await updateSystemSettings(next);
      if (!result.ok) {
        toast.error(result.error);
        setValue(value);
        return;
      }
      toast.success(t("settings.systemSettingsSaved"));
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t("settings.system")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">{t("settings.emailNotifications")}</p>
            <p className="text-xs text-text-secondary">{t("settings.emailNotificationsDesc")}</p>
          </div>
          <Switch checked={value.emailNotifications} onCheckedChange={(v) => update({ emailNotifications: v })} />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-text-primary">{t("settings.lowOccupancyAlerts")}</p>
            <p className="text-xs text-text-secondary">{t("settings.lowOccupancyAlertsDesc")}</p>
          </div>
          <Switch checked={value.lowOccupancyAlerts} onCheckedChange={(v) => update({ lowOccupancyAlerts: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
