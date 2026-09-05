import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/guards";

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Tunis",
  }).format(value);
}

function formatAmount(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  const reservationIds = notifications
    .map((notification) => notification.reservationId)
    .filter((id): id is string => Boolean(id));

  const reservations = reservationIds.length
    ? await prisma.reservation.findMany({
        where: { id: { in: reservationIds } },
        include: {
          guest: true,
          room: true,
          eventSpace: true,
          createdBy: true,
        },
      })
    : [];

  const reservationById = new Map(reservations.map((reservation) => [reservation.id, reservation]));
  const locale = user.language === "FR" ? "fr-FR" : "en-GB";

  const enrichedNotifications = notifications.map((notification) => {
    const reservation = notification.reservationId
      ? reservationById.get(notification.reservationId)
      : undefined;

    if (!reservation) return notification;

    const guestName = `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim();
    const creatorName = reservation.createdBy?.name || "—";
    const amount = `${formatAmount(reservation.totalAmount, locale)} DT`;

    const body = reservation.type === "STAY"
      ? user.language === "FR"
        ? `${reservation.code} · Client : ${guestName} · Chambre : ${reservation.room?.name || "—"} · ${reservation.checkIn ? formatDate(reservation.checkIn, locale) : "—"} → ${reservation.checkOut ? formatDate(reservation.checkOut, locale) : "—"} · ${reservation.adults || 0} adulte(s), ${reservation.children || 0} enfant(s) · ${amount} · Créée par : ${creatorName}`
        : `${reservation.code} · Guest: ${guestName} · Room: ${reservation.room?.name || "—"} · ${reservation.checkIn ? formatDate(reservation.checkIn, locale) : "—"} → ${reservation.checkOut ? formatDate(reservation.checkOut, locale) : "—"} · ${reservation.adults || 0} adult(s), ${reservation.children || 0} child(ren) · ${amount} · Created by: ${creatorName}`
      : user.language === "FR"
        ? `${reservation.code} · Client : ${guestName} · Espace : ${reservation.eventSpace?.name || "—"} · ${reservation.eventDate ? formatDate(reservation.eventDate, locale) : "—"} · ${reservation.eventStart || "—"}–${reservation.eventEnd || "—"} · ${reservation.guestCount || 0} invité(s) · ${amount} · Créée par : ${creatorName}`
        : `${reservation.code} · Guest: ${guestName} · Space: ${reservation.eventSpace?.name || "—"} · ${reservation.eventDate ? formatDate(reservation.eventDate, locale) : "—"} · ${reservation.eventStart || "—"}–${reservation.eventEnd || "—"} · ${reservation.guestCount || 0} guest(s) · ${amount} · Created by: ${creatorName}`;

    return { ...notification, body };
  });

  return NextResponse.json({ notifications: enrichedNotifications, unreadCount });
}
