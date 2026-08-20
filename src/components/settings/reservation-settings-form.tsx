"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldGroup } from "@/components/ui/input";
import { updateReservationSettings } from "@/app/(app)/settings/actions";
import { useI18n } from "@/lib/i18n/provider";

export function ReservationSettingsForm({ initial }: { initial: { cancellationPolicy: string; defaultDepositPercent: number } }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateReservationSettings(value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("settings.reservationSettingsSaved"));
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t("settings.reservationSettingsTitle")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup className="max-w-xs">
          <Label>{t("settings.defaultDepositPercent")}</Label>
          <Input type="number" min={0} max={100} value={value.defaultDepositPercent} onChange={(e) => setValue((v) => ({ ...v, defaultDepositPercent: Number(e.target.value) }))} />
        </FieldGroup>
        <FieldGroup>
          <Label>{t("settings.cancellationPolicy")}</Label>
          <Textarea rows={3} value={value.cancellationPolicy} onChange={(e) => setValue((v) => ({ ...v, cancellationPolicy: e.target.value }))} />
        </FieldGroup>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("common.saveChanges")}
        </Button>
      </CardContent>
    </Card>
  );
}
