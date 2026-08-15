"use client";

import { useState } from "react";
import { Wallet, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { AddExpenseDialog } from "@/components/finance/add-expense-dialog";

type DueReservation = { id: string; code: string; remainingAmount: number; guest: { firstName: string; lastName: string } };

export function FinanceActions({ dueReservations }: { dueReservations: DueReservation[] }) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => setExpenseOpen(true)}>
        <Receipt className="h-4 w-4" /> Add expense
      </Button>
      <Button onClick={() => setPaymentOpen(true)}>
        <Wallet className="h-4 w-4" /> Record payment
      </Button>
      <RecordPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} dueReservations={dueReservations} />
      <AddExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
    </div>
  );
}

export function BreakdownBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="font-medium text-text-primary">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
