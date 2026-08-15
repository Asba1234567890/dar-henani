import { prisma } from "@/lib/prisma";
import { deriveReservation } from "@/lib/reservations";

export async function listReservations() {
  const reservations = await prisma.reservation.findMany({
    include: { guest: true, room: true, eventSpace: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
  return reservations.map(deriveReservation);
}
