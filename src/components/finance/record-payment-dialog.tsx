"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldGroup, Textarea } from "@/components/ui/input";
import { addPayment } from "@/app/(app)/reservations/actions";
import { paymentMethodLabel } from "@/lib/status";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod } from "@prisma/client";

type DueReservation = { id: string; code: string; remainingAmount: number; guest: { firstName: string; lastName: string } };

export function RecordPaymentDialog({ open, onOpenChange, dueReservations }: { open: boolean; onOpenChange: (v: boolean) => void; dueReservations: DueReservation[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reservationId, setReservationId] = useState(dueReservations[0]?.id ?? "");
  const [amount, setAmount] = useState(dueReservations[0]?.remainingAmount ?? 0);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [note, setNote] = useState("");

  const selected = useMemo(() => dueReservations.find((r) => r.id === reservationId), [dueReservations, reservationId]);

  function handleSubmit() {
    startTransition(async () => {
      const result = await addPayment(reservationId, amount, method, note);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment recorded");
      onOpenChange(false);
      router.refresh();
    });
  }

  if (dueReservations.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <div className="px-6 py-6 text-sm text-text-secondary">No reservations currently have an outstanding balance.</div>
          <DialogFooter><Button onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <div className="space-y-4 px-6 py-2">
          <FieldGroup>
            <Label>Reservation</Label>
            <Select
              value={reservationId}
              onChange={(e) => {
                setReservationId(e.target.value);
                const r = dueReservations.find((x) => x.id === e.target.value);
                setAmount(r?.remainingAmount ?? 0);
              }}
            >
              {dueReservations.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.guest.firstName} {r.guest.lastName} (due {formatCurrency(r.remainingAmount)})
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>Amount</Label>
            <Input type="number" min={0} max={selected?.remainingAmount} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </FieldGroup>
          <FieldGroup>
            <Label>Payment method</Label>
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {Object.entries(paymentMethodLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>Note (optional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </FieldGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={pending || amount <= 0}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
