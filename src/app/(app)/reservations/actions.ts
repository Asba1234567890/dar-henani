"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReservationCode, isRoomAvailable } from "@/lib/reservations";

const guestSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  idNumber: z.string().optional(),
});

const baseSchema = z.object({
  guest: guestSchema,
  source: z.enum(["BOOKING_COM", "AIRBNB", "PHONE", "WHATSAPP", "DIRECT", "WALK_IN", "OTHER"]),
  basePrice: z.number().min(0),
  extraCharges: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  depositAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]).default("CASH"),
  notes: z.string().optional(),
});

const staySchema = baseSchema.extend({
  type: z.literal("STAY"),
  roomId: z.string().min(1, "Room is required"),
  checkIn: z.string(),
  checkOut: z.string(),
  adults: z.number().min(1).default(1),
  children: z.number().min(0).default(0),
});

const eventSchema = baseSchema.extend({
  type: z.literal("EVENT"),
  eventType: z.enum(["WEDDING", "HENNA", "BIRTHDAY", "ENGAGEMENT", "CORPORATE", "PRIVATE_EVENT", "DINNER", "PHOTOSHOOT", "OTHER"]),
  eventName: z.string().optional(),
  eventSpaceId: z.string().min(1, "Event space is required"),
  eventDate: z.string(),
  eventStart: z.string(),
  eventEnd: z.string(),
  guestCount: z.number().min(1),
  services: z.array(z.string()).default([]),
});

const createReservationSchema = z.discriminatedUnion("type", [staySchema, eventSchema]);

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

async function findOrCreateGuest(input: z.infer<typeof guestSchema>) {
  const phone = input.phone?.trim() || undefined;
  if (phone) {
    const existing = await prisma.guest.findFirst({ where: { phone } });
    if (existing) {
      return prisma.guest.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email || existing.email,
          idNumber: input.idNumber || existing.idNumber,
        },
      });
    }
  }
  return prisma.guest.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone,
      email: input.email || undefined,
      idNumber: input.idNumber || undefined,
    },
  });
}

export async function createReservation(raw: CreateReservationInput) {
  const input = createReservationSchema.parse(raw);
  const totalAmount = Math.max(input.basePrice + input.extraCharges - input.discount, 0);

  if (input.type === "STAY") {
    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);
    if (checkOut <= checkIn) {
      return { ok: false as const, error: "Check-out must be after check-in." };
    }
    const room = await prisma.room.findUnique({ where: { id: input.roomId } });
    if (!room) return { ok: false as const, error: "Selected room no longer exists." };
    if (room.status === "MAINTENANCE" || room.status === "OUT_OF_SERVICE") {
      return { ok: false as const, error: "This room is not available for booking." };
    }
    const available = await isRoomAvailable(input.roomId, checkIn, checkOut);
    if (!available) {
      return { ok: false as const, error: "This room is already reserved for these dates." };
    }

    const guest = await findOrCreateGuest(input.guest);
    const code = await generateReservationCode();

    const reservation = await prisma.reservation.create({
      data: {
        code,
        type: "STAY",
        status: "CONFIRMED",
        guestId: guest.id,
        roomId: input.roomId,
        checkIn,
        checkOut,
        adults: input.adults,
        children: input.children,
        source: input.source,
        basePrice: input.basePrice,
        extraCharges: input.extraCharges,
        discount: input.discount,
        totalAmount,
        notes: input.notes || undefined,
      },
    });

    if (input.depositAmount > 0) {
      await prisma.payment.create({
        data: { reservationId: reservation.id, amount: input.depositAmount, method: input.paymentMethod },
      });
    }

    revalidatePath("/reservations");
    revalidatePath("/dashboard");
    revalidatePath("/rooms");
    return { ok: true as const, id: reservation.id, code: reservation.code };
  }

  // EVENT
  const eventDate = new Date(input.eventDate);
  const overlapping = await prisma.reservation.findFirst({
    where: {
      type: "EVENT",
      eventSpaceId: input.eventSpaceId,
      status: { in: ["CONFIRMED", "PENDING"] },
      eventDate: { gte: new Date(eventDate.toDateString()), lt: new Date(new Date(eventDate).setDate(eventDate.getDate() + 1)) },
      AND: [{ eventStart: { lte: input.eventEnd } }, { eventEnd: { gte: input.eventStart } }],
    },
  });
  if (overlapping) {
    return { ok: false as const, error: "This event space is already booked for the selected time." };
  }

  const guest = await findOrCreateGuest(input.guest);
  const code = await generateReservationCode();

  const reservation = await prisma.reservation.create({
    data: {
      code,
      type: "EVENT",
      status: "CONFIRMED",
      guestId: guest.id,
      eventSpaceId: input.eventSpaceId,
      eventType: input.eventType,
      eventName: input.eventName || undefined,
      eventDate,
      eventStart: input.eventStart,
      eventEnd: input.eventEnd,
      guestCount: input.guestCount,
      services: JSON.stringify(input.services),
      source: input.source,
      basePrice: input.basePrice,
      extraCharges: input.extraCharges,
      discount: input.discount,
      totalAmount,
      notes: input.notes || undefined,
    },
  });

  if (input.depositAmount > 0) {
    await prisma.payment.create({
      data: { reservationId: reservation.id, amount: input.depositAmount, method: input.paymentMethod },
    });
  }

  revalidatePath("/reservations");
  revalidatePath("/dashboard");
  return { ok: true as const, id: reservation.id, code: reservation.code };
}

export async function addPayment(reservationId: string, amount: number, method: "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER", note?: string) {
  if (amount <= 0) return { ok: false as const, error: "Amount must be greater than zero." };
  await prisma.payment.create({ data: { reservationId, amount, method, note: note || undefined } });
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  return { ok: true as const };
}

export async function updateReservationStatus(
  reservationId: string,
  status: "CONFIRMED" | "PENDING" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW"
) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation) return { ok: false as const, error: "Reservation not found." };

  const data: Record<string, unknown> = { status };
  if (status === "CHECKED_OUT" && reservation.type === "STAY") {
    await prisma.room.update({ where: { id: reservation.roomId! }, data: { status: "CLEANING" } }).catch(() => {});
  }
  if (status === "CHECKED_IN" && reservation.type === "STAY") {
    await prisma.room.update({ where: { id: reservation.roomId! }, data: { status: "OCCUPIED" } }).catch(() => {});
  }
  if (status === "CANCELLED" && reservation.type === "STAY" && reservation.roomId) {
    await prisma.room.update({ where: { id: reservation.roomId }, data: { status: "AVAILABLE" } }).catch(() => {});
  }

  await prisma.reservation.update({ where: { id: reservationId }, data });
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  return { ok: true as const };
}

export async function updateReservationNotes(reservationId: string, notes: string) {
  await prisma.reservation.update({ where: { id: reservationId }, data: { notes } });
  revalidatePath(`/reservations/${reservationId}`);
  return { ok: true as const };
}
