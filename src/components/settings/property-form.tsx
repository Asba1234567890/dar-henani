"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { updateProperty } from "@/app/(app)/settings/actions";

export function PropertyForm({ initial }: { initial: { propertyName: string; address: string; phone: string; email: string; currency: string; checkInTime: string; checkOutTime: string } }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateProperty(value);
      toast.success("Property settings saved");
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Property</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label>Property name</Label>
            <Input value={value.propertyName} onChange={(e) => setValue((v) => ({ ...v, propertyName: e.target.value }))} />
          </FieldGroup>
          <FieldGroup>
            <Label>Currency</Label>
            <Input value={value.currency} onChange={(e) => setValue((v) => ({ ...v, currency: e.target.value }))} />
          </FieldGroup>
          <FieldGroup className="sm:col-span-2">
            <Label>Address</Label>
            <Input value={value.address} onChange={(e) => setValue((v) => ({ ...v, address: e.target.value }))} />
          </FieldGroup>
          <FieldGroup>
            <Label>Phone</Label>
            <Input value={value.phone} onChange={(e) => setValue((v) => ({ ...v, phone: e.target.value }))} />
          </FieldGroup>
          <FieldGroup>
            <Label>Email</Label>
            <Input value={value.email} onChange={(e) => setValue((v) => ({ ...v, email: e.target.value }))} />
          </FieldGroup>
          <FieldGroup>
            <Label>Check-in time</Label>
            <Input type="time" value={value.checkInTime} onChange={(e) => setValue((v) => ({ ...v, checkInTime: e.target.value }))} />
          </FieldGroup>
          <FieldGroup>
            <Label>Check-out time</Label>
            <Input type="time" value={value.checkOutTime} onChange={(e) => setValue((v) => ({ ...v, checkOutTime: e.target.value }))} />
          </FieldGroup>
        </div>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save changes
        </Button>
      </CardContent>
    </Card>
  );
}
