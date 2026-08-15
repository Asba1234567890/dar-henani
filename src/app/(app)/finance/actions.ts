"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const expenseSchema = z.object({
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  date: z.string(),
});

export async function addExpense(raw: z.infer<typeof expenseSchema>) {
  const input = expenseSchema.parse(raw);
  await prisma.expense.create({
    data: { category: input.category, description: input.description || undefined, amount: input.amount, date: new Date(input.date) },
  });
  revalidatePath("/finance");
  return { ok: true as const };
}
