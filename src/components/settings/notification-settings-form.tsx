"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateNotificationSettings } from "@/app/(app)/settings/actions";
import { useI18n } from "@/lib/i18n/provider";

type Value = { pushNotificationsEnabled: boolean; tomorrowRemindersEnabled: boolean; sevenDayRemindersEnabled: boolean };

export function NotificationSettingsForm({ initial }: { initial: Value }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();

  function update(patch: Partial<Value>) {
    const previous = value;
    const next = { ...value, ...patch };
    setValue(next);
    startTransition(async () => {
      const result = await updateNotificationSettings(next);
      if (!result.ok) {
        toast.error(result.error);
        setValue(previous);
        return;
      }
      toast.success(t("settings.notificationSettingsSaved"));
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t("settings.notifications")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">{t("settings.pushNotifications")}</p>
            <p className="text-xs text-text-secondary">{t("settings.pushNotificationsDesc")}</p>
          </div>
          <Switch checked={value.pushNotificationsEnabled} onCheckedChange={(v) => update({ pushNotificationsEnabled: v })} />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-text-primary">{t("settings.tomorrowReminders")}</p>
            <p className="text-xs text-text-secondary">{t("settings.tomorrowRemindersDesc")}</p>
          </div>
          <Switch checked={value.tomorrowRemindersEnabled} onCheckedChange={(v) => update({ tomorrowRemindersEnabled: v })} />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-text-primary">{t("settings.sevenDayReminders")}</p>
            <p className="text-xs text-text-secondary">{t("settings.sevenDayRemindersDesc")}</p>
          </div>
          <Switch checked={value.sevenDayRemindersEnabled} onCheckedChange={(v) => update({ sevenDayRemindersEnabled: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
