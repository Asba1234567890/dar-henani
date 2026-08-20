"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { updateProperty } from "@/app/(app)/settings/actions";
import { useI18n } from "@/lib/i18n/provider";

export function PropertyForm({ initial }: { initial: { propertyName: string; address: string; phone: string; email: string; currency: string; checkInTime: string; checkOutTime: string } }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateProperty(value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("settings.propertySaved"));
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t("settings.property")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label>{t("settings.propertyName")}</Label>
            <Input value={value.propertyName} onChange={(e) => setValue((v) => ({ ...v, propertyName: e.target.value }))} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("settings.currency")}</Label>
            <Input value={value.currency} onChange={(e) => setValue((v) => ({ ...v, currency: e.target.value }))} />
          </FieldGroup>
          <FieldGroup className="sm:col-span-2">
            <Label>{t("settings.address")}</Label>
            <Input value={value.address} onChange={(e) => setValue((v) => ({ ...v, address: e.target.value }))} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("common.phone")}</Label>
            <Input value={value.phone} onChange={(e) => setValue((v) => ({ ...v, phone: e.target.value }))} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("common.email")}</Label>
            <Input value={value.email} onChange={(e) => setValue((v) => ({ ...v, email: e.target.value }))} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("settings.checkInTime")}</Label>
            <Input type="time" value={value.checkInTime} onChange={(e) => setValue((v) => ({ ...v, checkInTime: e.target.value }))} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("settings.checkOutTime")}</Label>
            <Input type="time" value={value.checkOutTime} onChange={(e) => setValue((v) => ({ ...v, checkOutTime: e.target.value }))} />
          </FieldGroup>
        </div>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("common.saveChanges")}
        </Button>
      </CardContent>
    </Card>
  );
}
