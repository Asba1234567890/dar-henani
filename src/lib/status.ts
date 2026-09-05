import type { PaymentStatus, ReservationStatus, RoomStatus, BookingSource, EventType, PaymentMethod } from "@prisma/client";

type Dictionary = Record<string, any>;

export const reservationStatusVariant: Record<ReservationStatus, "success" | "warning" | "info" | "neutral" | "error"> = {
  CONFIRMED: "info",
  PENDING: "warning",
  CHECKED_IN: "success",
  CHECKED_OUT: "neutral",
  COMPLETED: "success",
  CANCELLED: "error",
  NO_SHOW: "error",
};

export const paymentStatusVariant: Record<PaymentStatus, "success" | "warning" | "error"> = {
  UNPAID: "error",
  PARTIALLY_PAID: "warning",
  PAID: "success",
};

export const roomStatusVariant: Record<RoomStatus, "success" | "info" | "warning" | "error" | "neutral"> = {
  AVAILABLE: "success",
  OCCUPIED: "info",
  CLEANING: "warning",
  MAINTENANCE: "error",
  OUT_OF_SERVICE: "neutral",
};

export function reservationStatusLabel(dict: Dictionary, status: ReservationStatus) {
  return dict.enums.reservationStatus[status];
}

export function paymentStatusLabel(dict: Dictionary, status: PaymentStatus) {
  return dict.enums.paymentStatus[status];
}

export function roomStatusLabel(dict: Dictionary, status: RoomStatus) {
  return dict.enums.roomStatus[status];
}

export function bookingSourceLabel(dict: Dictionary, source: BookingSource) {
  return dict.enums.bookingSource[source];
}

export function eventTypeLabel(dict: Dictionary, type: EventType) {
  return dict.enums.eventType[type];
}

export function paymentMethodLabel(dict: Dictionary, method: PaymentMethod) {
  return dict.enums.paymentMethod[method];
}

export function computePaymentStatus(totalAmount: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0) return "UNPAID";
  if (amountPaid >= totalAmount) return "PAID";
  return "PARTIALLY_PAID";
}
