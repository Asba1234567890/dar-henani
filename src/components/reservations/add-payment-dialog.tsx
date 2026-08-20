"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldGroup, Textarea } from "@/components/ui/input";
import { addPayment } from "@/app/(app)/reservations/actions";
import { useI18n } from "@/lib/i18n/provider";
import type { PaymentMethod } from "@prisma/client";

export function AddPaymentDialog({
  open,
  onOpenChange,
  reservationId,
  remainingAmount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reservationId: string;
  remainingAmount: number;
}) {
  const router = useRouter();
  const { t, dict } = useI18n();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(remainingAmount);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [note, setNote] = useState("");

  function handleSubmit() {
    startTransition(async () => {
      const result = await addPayment(reservationId, amount, method, note);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("reservations.paymentRecorded"));
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t("reservations.addPayment")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-2">
          <FieldGroup>
            <Label>{t("reservations.amount")}</Label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("reservations.paymentMethod")}</Label>
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {Object.entries(dict.enums.paymentMethod).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>{t("reservations.note")} ({t("common.optional")})</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </FieldGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={pending || amount <= 0}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("reservations.recordPayment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
