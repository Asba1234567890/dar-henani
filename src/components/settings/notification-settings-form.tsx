"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateNotificationSettings } from "@/app/(app)/settings/actions";

type Value = { pushNotificationsEnabled: boolean; tomorrowRemindersEnabled: boolean; sevenDayRemindersEnabled: boolean };

export function NotificationSettingsForm({ initial }: { initial: Value }) {
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
      toast.success("Notification settings saved");
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Push notifications</p>
            <p className="text-xs text-text-secondary">Send browser push notifications to admins for reservation events.</p>
          </div>
          <Switch checked={value.pushNotificationsEnabled} onCheckedChange={(v) => update({ pushNotificationsEnabled: v })} />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Tomorrow reminders</p>
            <p className="text-xs text-text-secondary">Notify about active stays/events happening the next day.</p>
          </div>
          <Switch checked={value.tomorrowRemindersEnabled} onCheckedChange={(v) => update({ tomorrowRemindersEnabled: v })} />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-text-primary">7-day reminders</p>
            <p className="text-xs text-text-secondary">Notify exactly one week before an active stay/event.</p>
          </div>
          <Switch checked={value.sevenDayRemindersEnabled} onCheckedChange={(v) => update({ sevenDayRemindersEnabled: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
