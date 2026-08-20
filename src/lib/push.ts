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

/** Sends a push notification to every subscription owned by `userId`.
 * Silently drops subscriptions the push service reports as gone (410/404). */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureConfigured();
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
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

/** Sends a push notification to every active user (used for reservation reminders). */
export async function sendPushToActiveUsers(payload: PushPayload) {
  const users = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
  await Promise.all(users.map((u) => sendPushToUser(u.id, payload)));
}
