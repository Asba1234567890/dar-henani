import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function getFinanceData() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    revenueToday,
    revenueWeek,
    revenueMonth,
    totalPaidAgg,
    activeReservations,
    expensesMonthAgg,
    paymentsByMethod,
    reservationsForRevenueSplit,
    recentPayments,
    dueReservations,
  ] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.reservation.findMany({
      where: { status: { in: ["CONFIRMED", "PENDING", "CHECKED_IN", "CHECKED_OUT"] } },
      select: { totalAmount: true, payments: { select: { amount: true } } },
    }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart, lte: monthEnd } } }),
    prisma.payment.groupBy({ by: ["method"], _sum: { amount: true } }),
    prisma.reservation.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { type: true, payments: { select: { amount: true } } },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { reservation: { include: { guest: true } } },
    }),
    prisma.reservation.findMany({
      where: { status: { in: ["CONFIRMED", "PENDING", "CHECKED_IN"] } },
      include: { guest: true, room: true, eventSpace: true, payments: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const outstanding = activeReservations.reduce((sum, r) => {
    const paid = r.payments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(r.totalAmount - paid, 0);
  }, 0);

  const revenueByType = { STAY: 0, EVENT: 0 };
  for (const r of reservationsForRevenueSplit) {
    const paid = r.payments.reduce((s, p) => s + p.amount, 0);
    revenueByType[r.type] += paid;
  }

  const expensesMonth = expensesMonthAgg._sum.amount ?? 0;
  const totalPaid = totalPaidAgg._sum.amount ?? 0;
  const netRevenueMonth = (revenueMonth._sum.amount ?? 0) - expensesMonth;

  const dueDerived = dueReservations
    .map((r) => {
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      return { ...r, amountPaid: paid, remainingAmount: Math.max(r.totalAmount - paid, 0) };
    })
    .filter((r) => r.remainingAmount > 0)
    .sort((a, b) => b.remainingAmount - a.remainingAmount);

  return {
    kpis: {
      revenueToday: revenueToday._sum.amount ?? 0,
      revenueWeek: revenueWeek._sum.amount ?? 0,
      revenueMonth: revenueMonth._sum.amount ?? 0,
      totalPaid,
      outstanding,
      expensesMonth,
      netRevenueMonth,
    },
    revenueByType,
    paymentsByMethod: paymentsByMethod.map((p) => ({ method: p.method, amount: p._sum.amount ?? 0 })),
    recentPayments,
    dueReservations: dueDerived,
  };
}
