import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function listRoomsWithOccupancy() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const rooms = await prisma.room.findMany({
    include: { roomType: true, amenities: { include: { amenity: true } } },
    orderBy: { name: "asc" },
  });

  const currentReservations = await prisma.reservation.findMany({
    where: {
      type: "STAY",
      status: { in: ["CHECKED_IN", "CONFIRMED"] },
      checkIn: { lte: dayEnd },
      checkOut: { gt: dayStart },
    },
    include: { guest: true },
  });

  const byRoom = new Map(currentReservations.map((r) => [r.roomId, r]));

  return rooms.map((room) => ({ ...room, currentReservation: byRoom.get(room.id) ?? null }));
}
