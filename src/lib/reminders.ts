import "server-only";
import { prisma } from "@/lib/prisma";
import { utcDayRange } from "@/lib/reservations";
import type { Reservation, Guest, Room, EventSpace } from "@prisma/client";

const ACTIVE_STATUSES = ["CONFIRMED", "PENDING", "CHECKED_IN"] as const;

type ReminderReservation = Reservation & { guest: Guest; room: Room | null; eventSpace: EventSpace | null };

async function findActiveReservationsOnDate(targetDate: Date): Promise<ReminderReservation[]> {
  const { start, end } = utcDayRange(targetDate);
  const [stays, events] = await Promise.all([
    prisma.reservation.findMany({
      where: { type: "STAY", status: { in: [...ACTIVE_STATUSES] }, checkIn: { gte: start, lt: end } },
      include: { guest: true, room: true, eventSpace: true },
    }),
    prisma.reservation.findMany({
      where: { type: "EVENT", status: { in: [...ACTIVE_STATUSES] }, eventDate: { gte: start, lt: end } },
      include: { guest: true, room: true, eventSpace: true },
    }),
  ]);
  return [...stays, ...events];
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatReminder(reservation: ReminderReservation, kind: "TOMORROW" | "SEVEN_DAY") {
  const guestName = `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim();
  const typeLabel = reservation.type === "EVENT" ? "Event" : "Stay";
  const title = kind === "TOMORROW" ? "🔔 Reservation Tomorrow" : "📅 Reservation in 1 Week";

  const lines: string[] = [`${guestName} — ${typeLabel}`];

  if (reservation.type === "STAY") {
    lines.push(kind === "TOMORROW" ? "Tomorrow" : formatDate(reservation.checkIn!));
    lines.push(reservation.room?.name ?? "Room");
    if (kind === "SEVEN_DAY" && reservation.checkOut) {
      lines.push(`Check-out ${formatDate(reservation.checkOut)}`);
    }
  } else {
    lines.push(kind === "TOMORROW" ? "Tomorrow" : formatDate(reservation.eventDate!));
    lines.push(reservation.eventSpace?.name ?? "Event space");
    if (reservation.eventStart && reservation.eventEnd) {
      lines.push(`${reservation.eventStart}–${reservation.eventEnd}`);
    }
    if (kind === "SEVEN_DAY" && reservation.guestCount) {
      lines.push(`${reservation.guestCount} guests`);
    }
  }

  lines.push(reservation.code);

  return { title, body: lines.join(" • "), reservation };
}

export async function getTomorrowReminderCandidates() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return findActiveReservationsOnDate(tomorrow);
}

export async function getSevenDayReminderCandidates() {
  const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return findActiveReservationsOnDate(inSevenDays);
}
