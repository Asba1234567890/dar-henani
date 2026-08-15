"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, LogOut, Ban, Wallet, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddPaymentDialog } from "@/components/reservations/add-payment-dialog";
import { updateReservationStatus } from "@/app/(app)/reservations/actions";
import type { ReservationStatus } from "@prisma/client";

export function ReservationActions({
  reservationId,
  status,
  remainingAmount,
}: {
  reservationId: string;
  status: ReservationStatus;
  remainingAmount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paymentOpen, setPaymentOpen] = useState(false);

  function setStatus(next: ReservationStatus, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    startTransition(async () => {
      const result = await updateReservationStatus(reservationId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Reservation updated");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="accent" onClick={() => setPaymentOpen(true)}>
        <Wallet className="h-4 w-4" /> Add payment
      </Button>

      {(status === "CONFIRMED" || status === "PENDING") && (
        <Button variant="outline" onClick={() => setStatus("CHECKED_IN")} disabled={pending}>
          <LogIn className="h-4 w-4" /> Check-in
        </Button>
      )}
      {status === "CHECKED_IN" && (
        <Button variant="outline" onClick={() => setStatus("CHECKED_OUT")} disabled={pending}>
          <LogOut className="h-4 w-4" /> Check-out
        </Button>
      )}
      {status !== "CANCELLED" && status !== "CHECKED_OUT" && (
        <Button
          variant="destructive"
          onClick={() => setStatus("CANCELLED", "Cancel this reservation? It will be preserved in history.")}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Cancel
        </Button>
      )}
      <Button variant="ghost" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print
      </Button>

      <AddPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        reservationId={reservationId}
        remainingAmount={remainingAmount}
      />
    </div>
  );
}
