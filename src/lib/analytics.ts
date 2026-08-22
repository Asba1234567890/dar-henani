import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  differenceInCalendarDays,
  format,
} from "date-fns";

export type AnalyticsRange = "today" | "week" | "month" | "year" | "custom";

export function resolveRange(range: AnalyticsRange, from?: string, to?: string) {
  const now = new Date();
  switch (range) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "custom":
      if (from && to) return { start: startOfDay(new Date(from)), end: endOfDay(new Date(to)) };
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "month":
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export async function getAnalyticsData(range: AnalyticsRange, from?: string, to?: string) {
  const { start, end } = resolveRange(range, from, to);
  const days = Math.max(differenceInCalendarDays(end, start) + 1, 1);
  const useMonthlyBuckets = days > 62;

  const [payments, reservationsCreated, totalRooms, stayReservationsInRange] = await Promise.all([
    prisma.payment.findMany({
      where: { createdAt: { gte: start, lte: end }, reservation: { status: { not: "CANCELLED" } } },
      include: { reservation: { select: { type: true, source: true } } },
    }),
    prisma.reservation.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { id: true, status: true, totalAmount: true, type: true },
    }),
    prisma.room.count({ where: { status: { not: "OUT_OF_SERVICE" } } }),
    prisma.reservation.findMany({
      where: {
        type: "STAY",
        status: { not: "CANCELLED" },
        checkIn: { lte: end },
        checkOut: { gte: start },
      },
      select: { checkIn: true, checkOut: true },
    }),
  ]);

  // Revenue by day/month
  const buckets = useMonthlyBuckets
    ? eachMonthOfInterval({ start, end }).map((d) => format(d, "yyyy-MM"))
    : eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
  const revenueMap = new Map(buckets.map((b) => [b, 0]));
  for (const p of payments) {
    const key = useMonthlyBuckets ? format(p.createdAt, "yyyy-MM") : format(p.createdAt, "yyyy-MM-dd");
    if (revenueMap.has(key)) revenueMap.set(key, (revenueMap.get(key) ?? 0) + p.amount);
  }
  const revenueSeries = buckets.map((b) => ({
    label: useMonthlyBuckets ? format(new Date(b + "-01"), "MMM yyyy") : format(new Date(b), "d MMM"),
    value: revenueMap.get(b) ?? 0,
  }));

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const revenueByType = { STAY: 0, EVENT: 0 };
  const revenueBySource: Record<string, number> = {};
  for (const p of payments) {
    revenueByType[p.reservation.type] += p.amount;
    revenueBySource[p.reservation.source] = (revenueBySource[p.reservation.source] ?? 0) + p.amount;
  }

  const totalReservations = reservationsCreated.length;
  const cancelledCount = reservationsCreated.filter((r) => r.status === "CANCELLED" || r.status === "NO_SHOW").length;
  const cancellationRate = totalReservations > 0 ? (cancelledCount / totalReservations) * 100 : 0;
  const avgBookingValue = totalReservations > 0
    ? reservationsCreated.reduce((s, r) => s + r.totalAmount, 0) / totalReservations
    : 0;

  // Room-nights occupied within range (clamped overlap)
  let occupiedRoomNights = 0;
  for (const r of stayReservationsInRange) {
    const s = r.checkIn! > start ? r.checkIn! : start;
    const e = r.checkOut! < end ? r.checkOut! : end;
    const nights = Math.max(differenceInCalendarDays(e, s), 0);
    occupiedRoomNights += nights;
  }
  const availableRoomNights = totalRooms * days;
  const occupancyRate = availableRoomNights > 0 ? (occupiedRoomNights / availableRoomNights) * 100 : 0;
  const adr = occupiedRoomNights > 0 ? revenueByType.STAY / occupiedRoomNights : 0;
  const revPAR = availableRoomNights > 0 ? revenueByType.STAY / availableRoomNights : 0;

  return {
    range: { start, end, days },
    revenueSeries,
    totalRevenue,
    revenueByType,
    revenueBySource,
    totalReservations,
    cancellationRate,
    avgBookingValue,
    occupancyRate,
    adr,
    revPAR,
  };
}
