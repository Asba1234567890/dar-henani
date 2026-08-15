import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const spaces = await prisma.eventSpace.findMany({ orderBy: { name: "asc" } });
  const dayStart = new Date(new Date(date).toDateString());
  const dayEnd = new Date(new Date(dayStart).setDate(dayStart.getDate() + 1));

  const bookings = await prisma.reservation.findMany({
    where: {
      type: "EVENT",
      status: { in: ["CONFIRMED", "PENDING"] },
      eventDate: { gte: dayStart, lt: dayEnd },
    },
    select: { eventSpaceId: true, eventStart: true, eventEnd: true },
  });

  const result = spaces.map((space) => {
    const clashes = bookings.some(
      (b) =>
        b.eventSpaceId === space.id &&
        start &&
        end &&
        b.eventStart! <= end &&
        b.eventEnd! >= start
    );
    return { ...space, isAvailable: !clashes };
  });

  return NextResponse.json({ spaces: result });
}
