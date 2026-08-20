"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateReservationCode, isRoomAvailable, isEventSpaceAvailable } from "@/lib/reservations";

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
  checkIn: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid check-in date"),
  checkOut: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid check-out date"),
  adults: z.number().min(1).default(1),
  children: z.number().min(0).default(0),
});

const eventSchema = baseSchema.extend({
  type: z.literal("EVENT"),
  eventType: z.enum(["WEDDING", "HENNA", "BIRTHDAY", "ENGAGEMENT", "CORPORATE", "PRIVATE_EVENT", "DINNER", "PHOTOSHOOT", "OTHER"]),
  eventName: z.string().optional(),
  eventSpaceId: z.string().min(1, "Event space is required"),
  eventDate: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid event date"),
  eventStart: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time"),
  eventEnd: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time"),
  guestCount: z.number().min(1),
  services: z.array(z.string()).default([]),
});

const createReservationSchema = z
  .discriminatedUnion("type", [staySchema, eventSchema])
  .refine((v) => v.depositAmount <= Math.max(v.basePrice + v.extraCharges - v.discount, 0), {
    message: "Deposit cannot exceed the total amount.",
    path: ["depositAmount"],
  })
  .refine((v) => (v.type === "EVENT" ? v.eventEnd > v.eventStart : true), {
    message: "Event end time must be after start time.",
    path: ["eventEnd"],
  });

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

const MAX_CODE_ATTEMPTS = 5;

/** Creates the reservation + optional deposit payment atomically, retrying with a fresh
 * code if a concurrent request already claimed the sequential code we generated. */
async function createReservationWithRetry(
  buildData: (code: string) => Prisma.ReservationCreateInput,
  depositAmount: number,
  paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER"
) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = await generateReservationCode(prisma, attempt);
    try {
      return await prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.create({ data: buildData(code) });
        if (depositAmount > 0) {
          await tx.payment.create({
            data: { reservationId: reservation.id, amount: depositAmount, method: paymentMethod },
          });
        }
        return reservation;
      });
    } catch (err) {
      const isCodeCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("code");
      if (isCodeCollision && attempt < MAX_CODE_ATTEMPTS - 1) continue;
      throw err;
    }
  }
  throw new Error("Could not generate a unique reservation code.");
}

export async function createReservation(raw: CreateReservationInput) {
  let input: CreateReservationInput;
  try {
    input = createReservationSchema.parse(raw);
  } catch {
    return { ok: false as const, error: "Invalid reservation details. Please check the form and try again." };
  }

  const totalAmount = Math.max(input.basePrice + input.extraCharges - input.discount, 0);

  try {
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

      const reservation = await createReservationWithRetry(
        (code) => ({
          code,
          type: "STAY",
          status: "CONFIRMED",
          guest: { connect: { id: guest.id } },
          room: { connect: { id: input.roomId } },
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
        }),
        input.depositAmount,
        input.paymentMethod
      );

      revalidatePath("/reservations");
      revalidatePath("/dashboard");
      revalidatePath("/rooms");
      return { ok: true as const, id: reservation.id, code: reservation.code };
    }

    // EVENT
    const eventDate = new Date(input.eventDate);
    const eventSpace = await prisma.eventSpace.findUnique({ where: { id: input.eventSpaceId } });
    if (!eventSpace) return { ok: false as const, error: "Selected event space no longer exists." };

    const available = await isEventSpaceAvailable(input.eventSpaceId, eventDate, input.eventStart, input.eventEnd);
    if (!available) {
      return { ok: false as const, error: "This event space is already booked for the selected time." };
    }

    const guest = await findOrCreateGuest(input.guest);

    const reservation = await createReservationWithRetry(
      (code) => ({
        code,
        type: "EVENT",
        status: "CONFIRMED",
        guest: { connect: { id: guest.id } },
        eventSpace: { connect: { id: input.eventSpaceId } },
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
      }),
      input.depositAmount,
      input.paymentMethod
    );

    revalidatePath("/reservations");
    revalidatePath("/dashboard");
    return { ok: true as const, id: reservation.id, code: reservation.code };
  } catch (err) {
    console.error("createReservation failed:", err);
    return { ok: false as const, error: "Something went wrong while creating the reservation. Please try again." };
  }
}

export async function addPayment(
  reservationId: string,
  amount: number,
  method: "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER",
  note?: string
) {
  if (amount <= 0) return { ok: false as const, error: "Amount must be greater than zero." };
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return { ok: false as const, error: "Reservation not found." };

    await prisma.payment.create({ data: { reservationId, amount, method, note: note || undefined } });
    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath("/reservations");
    revalidatePath("/dashboard");
    revalidatePath("/finance");
    return { ok: true as const };
  } catch (err) {
    console.error("addPayment failed:", err);
    return { ok: false as const, error: "Could not record the payment. Please try again." };
  }
}

export async function updateReservationStatus(
  reservationId: string,
  status: "CONFIRMED" | "PENDING" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW"
) {
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return { ok: false as const, error: "Reservation not found." };

    const data: Record<string, unknown> = { status };
    if (status === "CHECKED_OUT" && reservation.type === "STAY" && reservation.roomId) {
      await prisma.room.update({ where: { id: reservation.roomId }, data: { status: "CLEANING" } }).catch(() => {});
    }
    if (status === "CHECKED_IN" && reservation.type === "STAY" && reservation.roomId) {
      await prisma.room.update({ where: { id: reservation.roomId }, data: { status: "OCCUPIED" } }).catch(() => {});
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
  } catch (err) {
    console.error("updateReservationStatus failed:", err);
    return { ok: false as const, error: "Could not update the reservation status. Please try again." };
  }
}

export async function updateReservationNotes(reservationId: string, notes: string) {
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) return { ok: false as const, error: "Reservation not found." };

    await prisma.reservation.update({ where: { id: reservationId }, data: { notes } });
    revalidatePath(`/reservations/${reservationId}`);
    return { ok: true as const };
  } catch (err) {
    console.error("updateReservationNotes failed:", err);
    return { ok: false as const, error: "Could not update the notes. Please try again." };
  }
}
