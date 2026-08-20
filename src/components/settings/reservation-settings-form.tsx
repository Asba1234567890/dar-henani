"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldGroup } from "@/components/ui/input";
import { updateReservationSettings } from "@/app/(app)/settings/actions";

export function ReservationSettingsForm({ initial }: { initial: { cancellationPolicy: string; defaultDepositPercent: number } }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateReservationSettings(value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Reservation settings saved");
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Reservation settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup className="max-w-xs">
          <Label>Default deposit (%)</Label>
          <Input type="number" min={0} max={100} value={value.defaultDepositPercent} onChange={(e) => setValue((v) => ({ ...v, defaultDepositPercent: Number(e.target.value) }))} />
        </FieldGroup>
        <FieldGroup>
          <Label>Default cancellation policy</Label>
          <Textarea rows={3} value={value.cancellationPolicy} onChange={(e) => setValue((v) => ({ ...v, cancellationPolicy: e.target.value }))} />
        </FieldGroup>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save changes
        </Button>
      </CardContent>
    </Card>
  );
}
