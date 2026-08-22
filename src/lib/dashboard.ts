import { prisma } from "@/lib/prisma";
import { deriveReservation } from "@/lib/reservations";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

const ACTIVE_STATUSES = ["CONFIRMED", "PENDING", "CHECKED_IN"] as const;

export async function getDashboardData() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    arrivalsRaw,
    departuresRaw,
    stayingCount,
    upcomingCount,
    revenueTodayAgg,
    revenueMonthAgg,
    activeReservations,
    totalRooms,
    occupiedRoomsRaw,
    eventsTodayRaw,
    recentReservationsRaw,
  ] = await Promise.all([
    prisma.reservation.findMany({
      where: { type: "STAY", checkIn: { gte: dayStart, lte: dayEnd }, status: { in: [...ACTIVE_STATUSES] } },
      include: { guest: true, room: true, payments: true },
      orderBy: { checkIn: "asc" },
    }),
    prisma.reservation.findMany({
      where: { type: "STAY", checkOut: { gte: dayStart, lte: dayEnd }, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
      include: { guest: true, room: true, payments: true },
      orderBy: { checkOut: "asc" },
    }),
    prisma.reservation.count({
      where: { type: "STAY", status: "CHECKED_IN", checkIn: { lte: dayEnd }, checkOut: { gt: dayStart } },
    }),
    prisma.reservation.count({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        OR: [{ type: "STAY", checkIn: { gt: dayEnd } }, { type: "EVENT", eventDate: { gt: dayEnd } }],
      },
    }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: dayStart, lte: dayEnd }, reservation: { status: { not: "CANCELLED" } } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: monthStart, lte: monthEnd }, reservation: { status: { not: "CANCELLED" } } } }),
    prisma.reservation.findMany({
      where: { status: { in: [...ACTIVE_STATUSES] } },
      select: { totalAmount: true, payments: { select: { amount: true } } },
    }),
    prisma.room.count({ where: { status: { notIn: ["OUT_OF_SERVICE"] } } }),
    prisma.reservation.findMany({
      where: { type: "STAY", status: { in: [...ACTIVE_STATUSES] }, checkIn: { lte: dayEnd }, checkOut: { gt: dayStart } },
      select: { roomId: true },
    }),
    prisma.reservation.findMany({
      where: { type: "EVENT", eventDate: { gte: dayStart, lte: dayEnd }, status: { in: [...ACTIVE_STATUSES] } },
      include: { guest: true, eventSpace: true, payments: true },
      orderBy: { eventStart: "asc" },
    }),
    prisma.reservation.findMany({
      include: { guest: true, room: true, eventSpace: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const outstanding = activeReservations.reduce((sum, r) => {
    const paid = r.payments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(r.totalAmount - paid, 0);
  }, 0);

  const occupiedRoomCount = new Set(occupiedRoomsRaw.map((r) => r.roomId)).size;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRoomCount / totalRooms) * 100) : 0;

  return {
    date: now,
    kpis: {
      arrivalsToday: arrivalsRaw.length,
      departuresToday: departuresRaw.length,
      guestsStaying: stayingCount,
      upcomingReservations: upcomingCount,
      revenueToday: revenueTodayAgg._sum.amount ?? 0,
      revenueMonth: revenueMonthAgg._sum.amount ?? 0,
      outstanding,
      occupancyRate,
    },
    arrivals: arrivalsRaw.map(deriveReservation),
    departures: departuresRaw.map(deriveReservation),
    eventsToday: eventsTodayRaw.map(deriveReservation),
    recentReservations: recentReservationsRaw.map(deriveReservation),
  };
}
