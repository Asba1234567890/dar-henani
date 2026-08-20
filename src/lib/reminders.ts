import "server-only";
import { prisma } from "@/lib/prisma";
import { utcDayRange } from "@/lib/reservations";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Reservation, Guest, Room, EventSpace, Language } from "@prisma/client";

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

function formatDate(date: Date, language: Language) {
  return date.toLocaleDateString(language === "FR" ? "fr-FR" : "en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Builds the reminder title/body in the given user's language. Called once per
 * (reservation, recipient) pair so every admin/user sees it in their own preferred language. */
export function formatReminder(reservation: ReminderReservation, kind: "TOMORROW" | "SEVEN_DAY", language: Language) {
  const dict = getDictionary(language);
  const guestName = `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim();
  const typeLabel = reservation.type === "EVENT" ? dict.reservations.event : dict.reservations.stay;
  const title = kind === "TOMORROW" ? dict.notifications.tomorrowTitle : dict.notifications.weekTitle;

  const lines: string[] = [`${guestName} — ${typeLabel}`];

  if (reservation.type === "STAY") {
    lines.push(kind === "TOMORROW" ? dict.common.tomorrow : formatDate(reservation.checkIn!, language));
    lines.push(reservation.room?.name ?? dict.rooms.room);
    if (kind === "SEVEN_DAY" && reservation.checkOut) {
      lines.push(`${dict.reservations.checkOut} ${formatDate(reservation.checkOut, language)}`);
    }
  } else {
    lines.push(kind === "TOMORROW" ? dict.common.tomorrow : formatDate(reservation.eventDate!, language));
    lines.push(reservation.eventSpace?.name ?? dict.reservations.eventSpace);
    if (reservation.eventStart && reservation.eventEnd) {
      lines.push(`${reservation.eventStart}–${reservation.eventEnd}`);
    }
    if (kind === "SEVEN_DAY" && reservation.guestCount) {
      lines.push(`${reservation.guestCount} ${dict.common.guests}`);
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
