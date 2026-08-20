"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/input";
import { addExpense } from "@/app/(app)/finance/actions";
import { useI18n } from "@/lib/i18n/provider";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AddExpenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayISO());

  function handleSubmit() {
    startTransition(async () => {
      const result = await addExpense({ category, description, amount, date });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("finance.expenseRecorded"));
      onOpenChange(false);
      setCategory("");
      setDescription("");
      setAmount(0);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader><DialogTitle>{t("finance.addExpense")}</DialogTitle></DialogHeader>
        <div className="space-y-4 px-6 py-2">
          <FieldGroup>
            <Label>{t("finance.category")}</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("finance.categoryPlaceholder")} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("finance.amount")}</Label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("finance.date")}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>{t("finance.description")} ({t("common.optional")})</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FieldGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={pending || !category || amount <= 0}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("finance.addExpense")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
