import type { PaymentStatus, ReservationStatus, RoomStatus, BookingSource, EventType, PaymentMethod } from "@prisma/client";

export const reservationStatusLabel: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  CHECKED_IN: "Checked-in",
  CHECKED_OUT: "Checked-out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

export const reservationStatusVariant: Record<ReservationStatus, "success" | "warning" | "info" | "neutral" | "error"> = {
  CONFIRMED: "info",
  PENDING: "warning",
  CHECKED_IN: "success",
  CHECKED_OUT: "neutral",
  CANCELLED: "error",
  NO_SHOW: "error",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
};

export const paymentStatusVariant: Record<PaymentStatus, "success" | "warning" | "error"> = {
  UNPAID: "error",
  PARTIALLY_PAID: "warning",
  PAID: "success",
};

export const roomStatusLabel: Record<RoomStatus, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  OUT_OF_SERVICE: "Out of service",
};

export const roomStatusVariant: Record<RoomStatus, "success" | "info" | "warning" | "error" | "neutral"> = {
  AVAILABLE: "success",
  OCCUPIED: "info",
  CLEANING: "warning",
  MAINTENANCE: "error",
  OUT_OF_SERVICE: "neutral",
};

export const bookingSourceLabel: Record<BookingSource, string> = {
  BOOKING_COM: "Booking.com",
  AIRBNB: "Airbnb",
  PHONE: "Phone",
  WHATSAPP: "WhatsApp",
  DIRECT: "Direct",
  WALK_IN: "Walk-in",
  OTHER: "Other",
};

export const eventTypeLabel: Record<EventType, string> = {
  WEDDING: "Wedding",
  HENNA: "Henna",
  BIRTHDAY: "Birthday",
  ENGAGEMENT: "Engagement",
  CORPORATE: "Corporate",
  PRIVATE_EVENT: "Private event",
  DINNER: "Dinner",
  PHOTOSHOOT: "Photoshoot",
  OTHER: "Other",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

export function computePaymentStatus(totalAmount: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0) return "UNPAID";
  if (amountPaid >= totalAmount) return "PAID";
  return "PARTIALLY_PAID";
}
