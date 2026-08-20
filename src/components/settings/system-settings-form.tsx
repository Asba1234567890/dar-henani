"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateSystemSettings } from "@/app/(app)/settings/actions";

export function SystemSettingsForm({ initial }: { initial: { emailNotifications: boolean; lowOccupancyAlerts: boolean } }) {
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
      toast.success("Settings saved");
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>System</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Email notifications</p>
            <p className="text-xs text-text-secondary">Receive daily summaries and new reservation alerts by email.</p>
          </div>
          <Switch checked={value.emailNotifications} onCheckedChange={(v) => update({ emailNotifications: v })} />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Low occupancy alerts</p>
            <p className="text-xs text-text-secondary">Get notified when occupancy drops below 30% for the upcoming week.</p>
          </div>
          <Switch checked={value.lowOccupancyAlerts} onCheckedChange={(v) => update({ lowOccupancyAlerts: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
