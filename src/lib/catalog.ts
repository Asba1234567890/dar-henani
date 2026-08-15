import { prisma } from "@/lib/prisma";

export async function getEventSpaces() {
  return prisma.eventSpace.findMany({ orderBy: { name: "asc" } });
}

export async function getRoomTypes() {
  return prisma.roomType.findMany({ orderBy: { name: "asc" } });
}

export async function getAmenities() {
  return prisma.amenity.findMany({ orderBy: { name: "asc" } });
}
