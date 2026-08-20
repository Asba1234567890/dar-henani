import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTomorrowReminderCandidates, getSevenDayReminderCandidates, formatReminder } from "@/lib/reminders";
import { sendPushToActiveUsers } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function processBatch(
  candidates: Awaited<ReturnType<typeof getTomorrowReminderCandidates>>,
  kind: "TOMORROW" | "SEVEN_DAY",
  pushEnabled: boolean
) {
  let sent = 0;
  let skipped = 0;

  for (const reservation of candidates) {
    try {
      // The unique (reservationId, type) constraint is the real dedupe guarantee — it
      // rejects a second insert even if the cron endpoint is triggered twice concurrently.
      await prisma.reminderLog.create({ data: { reservationId: reservation.id, type: kind } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        skipped++;
        continue;
      }
      console.error(`Failed to log reminder for reservation ${reservation.id}:`, err);
      continue;
    }

    const { title, body } = formatReminder(reservation, kind);

    try {
      const activeUsers = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
      await prisma.notification.createMany({
        data: activeUsers.map((u) => ({ userId: u.id, title, body, reservationId: reservation.id })),
      });

      if (pushEnabled) {
        await sendPushToActiveUsers({ title, body, url: `/reservations/${reservation.id}`, tag: `${kind}-${reservation.id}` });
      }
      sent++;
    } catch (err) {
      console.error(`Failed to notify for reservation ${reservation.id}:`, err);
    }
  }

  return { sent, skipped };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.propertySettings.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });

    const results = { tomorrow: { sent: 0, skipped: 0 }, sevenDay: { sent: 0, skipped: 0 } };

    if (settings.tomorrowRemindersEnabled) {
      const candidates = await getTomorrowReminderCandidates();
      results.tomorrow = await processBatch(candidates, "TOMORROW", settings.pushNotificationsEnabled);
    }

    if (settings.sevenDayRemindersEnabled) {
      const candidates = await getSevenDayReminderCandidates();
      results.sevenDay = await processBatch(candidates, "SEVEN_DAY", settings.pushNotificationsEnabled);
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    console.error("Reminder cron failed:", err);
    return NextResponse.json({ error: "Reminder job failed." }, { status: 500 });
  }
}
