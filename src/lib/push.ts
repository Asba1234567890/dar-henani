import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

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

async function enrichReservationPush(userId: string, payload: PushPayload): Promise<PushPayload> {
  const match = payload.url?.match(/^\/reservations\/([^/?#]+)/);
  if (!match) return payload;

  const reservation = await prisma.reservation.findUnique({
    where: { id: match[1] },
    include: {
      guest: true,
      room: true,
      eventSpace: true,
      createdBy: true,
    },
  });
  if (!reservation) return payload;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { language: true } });
  const isFrench = user?.language === "FR";
  const locale = isFrench ? "fr-FR" : "en-GB";
  const guestName = `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim();
  const creatorName = reservation.createdBy?.name || "—";
  const amount = `${formatAmount(reservation.totalAmount, locale)} DT`;

  const body = reservation.type === "STAY"
    ? isFrench
      ? `${reservation.code} · Client : ${guestName} · Chambre : ${reservation.room?.name || "—"} · ${reservation.checkIn ? formatDate(reservation.checkIn, locale) : "—"} → ${reservation.checkOut ? formatDate(reservation.checkOut, locale) : "—"} · ${reservation.adults || 0} adulte(s), ${reservation.children || 0} enfant(s) · ${amount} · Créée par : ${creatorName}`
      : `${reservation.code} · Guest: ${guestName} · Room: ${reservation.room?.name || "—"} · ${reservation.checkIn ? formatDate(reservation.checkIn, locale) : "—"} → ${reservation.checkOut ? formatDate(reservation.checkOut, locale) : "—"} · ${reservation.adults || 0} adult(s), ${reservation.children || 0} child(ren) · ${amount} · Created by: ${creatorName}`
    : isFrench
      ? `${reservation.code} · Client : ${guestName} · Espace : ${reservation.eventSpace?.name || "—"} · ${reservation.eventDate ? formatDate(reservation.eventDate, locale) : "—"} · ${reservation.eventStart || "—"}–${reservation.eventEnd || "—"} · ${reservation.guestCount || 0} invité(s) · ${amount} · Créée par : ${creatorName}`
      : `${reservation.code} · Guest: ${guestName} · Space: ${reservation.eventSpace?.name || "—"} · ${reservation.eventDate ? formatDate(reservation.eventDate, locale) : "—"} · ${reservation.eventStart || "—"}–${reservation.eventEnd || "—"} · ${reservation.guestCount || 0} guest(s) · ${amount} · Created by: ${creatorName}`;

  return { ...payload, body };
}

/** Sends a push notification to every subscription owned by `userId`.
 * Silently drops subscriptions the push service reports as gone (410/404). */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureConfigured();
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  const enrichedPayload = await enrichReservationPush(userId, payload).catch((err) => {
    console.error(`Failed to enrich push payload for user ${userId}:`, err);
    return payload;
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(enrichedPayload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`sendPushToUser failed for subscription ${sub.id}:`, err);
        }
      }
    })
  );
}
