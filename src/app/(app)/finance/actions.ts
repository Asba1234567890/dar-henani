"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const expenseSchema = z.object({
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  date: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date"),
});

export async function addExpense(raw: z.infer<typeof expenseSchema>) {
  const auth = await authorize("ADMIN");
  if (!auth.ok) return auth;
  const dict = getDictionary(auth.user.language);

  try {
    const input = expenseSchema.parse(raw);
    const expense = await prisma.expense.create({
      data: {
        category: input.category,
        description: input.description || undefined,
        amount: input.amount,
        date: new Date(input.date),
        recordedById: auth.user.id,
      },
    });
    await logAudit(auth.user.id, "EXPENSE_ADDED", { targetType: "Expense", targetId: expense.id, metadata: { amount: input.amount } });
    revalidatePath("/finance");
    return { ok: true as const };
  } catch (err) {
    console.error("addExpense failed:", err);
    return { ok: false as const, error: dict.finance.addExpenseFailed };
  }
}
