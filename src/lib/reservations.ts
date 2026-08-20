import { prisma } from "@/lib/prisma";
import { computePaymentStatus } from "@/lib/status";
import type { Prisma, Reservation, Payment, Guest, Room, EventSpace } from "@prisma/client";

export type ReservationWithRelations = Reservation & {
  guest: Guest;
  room: Room | null;
  eventSpace: EventSpace | null;
  payments: Payment[];
};

export function deriveReservation<T extends { totalAmount: number; payments: { amount: number }[] }>(
  reservation: T
) {
  const amountPaid = reservation.payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = Math.max(reservation.totalAmount - amountPaid, 0);
  const paymentStatus = computePaymentStatus(reservation.totalAmount, amountPaid);
  return { ...reservation, amountPaid, remainingAmount, paymentStatus };
}

/** Generate a human-friendly, sequential reservation code, e.g. DH-2026-0007 */
export async function generateReservationCode(tx: Prisma.TransactionClient = prisma, offset = 0) {
  const year = new Date().getFullYear();
  const count = await tx.reservation.count({
    where: { createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) } },
  });
  return `DH-${year}-${String(count + 1 + offset).padStart(4, "0")}`;
}

/** UTC-safe [start, end) boundaries for the calendar day of `date`, independent of server timezone. */
export function utcDayRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** Rooms considered "blocking" a date range: active (non-cancelled/no-show) stay reservations that overlap. */
const BLOCKING_STATUSES = ["CONFIRMED", "PENDING", "CHECKED_IN"] as const;

export async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeReservationId?: string
) {
  const overlapping = await prisma.reservation.findFirst({
    where: {
      roomId,
      type: "STAY",
      status: { in: [...BLOCKING_STATUSES] },
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
    },
    select: { id: true },
  });
  return !overlapping;
}

export async function isEventSpaceAvailable(
  eventSpaceId: string,
  eventDate: Date,
  eventStart: string,
  eventEnd: string,
  excludeReservationId?: string
) {
  const { start, end } = utcDayRange(eventDate);
  const overlapping = await prisma.reservation.findFirst({
    where: {
      eventSpaceId,
      type: "EVENT",
      status: { in: ["CONFIRMED", "PENDING"] },
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      eventDate: { gte: start, lt: end },
      AND: [{ eventStart: { lte: eventEnd } }, { eventEnd: { gte: eventStart } }],
    },
    select: { id: true },
  });
  return !overlapping;
}

export async function getAvailableRooms(checkIn: Date, checkOut: Date) {
  const rooms = await prisma.room.findMany({
    where: { status: { notIn: ["MAINTENANCE", "OUT_OF_SERVICE"] } },
    include: { roomType: true, amenities: { include: { amenity: true } } },
    orderBy: { name: "asc" },
  });

  const overlapping = await prisma.reservation.findMany({
    where: {
      type: "STAY",
      status: { in: [...BLOCKING_STATUSES] },
      AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
    },
    select: { roomId: true },
  });
  const bookedRoomIds = new Set(overlapping.map((r) => r.roomId));

  return rooms.map((room) => ({ ...room, isAvailable: !bookedRoomIds.has(room.id) }));
}
