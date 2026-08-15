"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BedDouble, PartyPopper, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldGroup } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { createReservation, type CreateReservationInput } from "@/app/(app)/reservations/actions";
import { bookingSourceLabel, eventTypeLabel, paymentMethodLabel } from "@/lib/status";
import type { BookingSource, EventType, PaymentMethod } from "@prisma/client";

type RoomOption = {
  id: string;
  name: string;
  capacity: number;
  pricePerNight: number;
  status: string;
  isAvailable: boolean;
  roomType: { name: string } | null;
};

type EventSpaceOption = { id: string; name: string; capacity: number | null; isAvailable: boolean };

const SOURCES = Object.entries(bookingSourceLabel);
const EVENT_TYPES = Object.entries(eventTypeLabel);
const METHODS = Object.entries(paymentMethodLabel);
const SERVICE_OPTIONS = ["Catering", "Decoration", "Music", "Photography", "Other"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CreateReservationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [resType, setResType] = useState<"STAY" | "EVENT" | null>(null);

  // Stay state
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomId, setRoomId] = useState<string>("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Event state
  const [eventType, setEventType] = useState("WEDDING");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(todayISO());
  const [eventStart, setEventStart] = useState("18:00");
  const [eventEnd, setEventEnd] = useState("23:00");
  const [guestCount, setGuestCount] = useState(20);
  const [eventSpaces, setEventSpaces] = useState<EventSpaceOption[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [eventSpaceId, setEventSpaceId] = useState<string>("");
  const [services, setServices] = useState<string[]>([]);

  // Guest
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [source, setSource] = useState("DIRECT");

  // Pricing
  const [pricePerNight, setPricePerNight] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [extraCharges, setExtraCharges] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Payment
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");

  const nights = useMemo(() => {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const stayBase = pricePerNight * nights;
  const total = resType === "STAY" ? Math.max(stayBase + extraCharges - discount, 0) : Math.max(basePrice + extraCharges - discount, 0);
  const remaining = Math.max(total - depositAmount, 0);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setStep(0);
      setResType(null);
      resetForm();
    }
  }

  function resetForm() {
    setRoomId("");
    setEventSpaceId("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setIdNumber("");
    setPricePerNight(0);
    setBasePrice(0);
    setExtraCharges(0);
    setDiscount(0);
    setDepositAmount(0);
    setNotes("");
    setServices([]);
  }

  useEffect(() => {
    if (resType !== "STAY" || step !== 1) return;
    if (!checkIn || !checkOut || nights <= 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching room availability whenever dates change
    setLoadingRooms(true);
    fetch(`/api/rooms/available?checkIn=${checkIn}&checkOut=${checkOut}`)
      .then((r) => r.json())
      .then((data) => setRooms(data.rooms ?? []))
      .finally(() => setLoadingRooms(false));
  }, [resType, step, checkIn, checkOut, nights]);

  useEffect(() => {
    if (resType !== "EVENT" || step !== 1) return;
    if (!eventDate) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching event space availability whenever date/time changes
    setLoadingSpaces(true);
    fetch(`/api/event-spaces/available?date=${eventDate}&start=${eventStart}&end=${eventEnd}`)
      .then((r) => r.json())
      .then((data) => setEventSpaces(data.spaces ?? []))
      .finally(() => setLoadingSpaces(false));
  }, [resType, step, eventDate, eventStart, eventEnd]);

  const stepsForStay = ["Type", "Dates & Room", "Guest", "Pricing & Source", "Payment & Notes"];
  const stepsForEvent = ["Type", "Event Details", "Client", "Pricing & Services", "Payment & Notes"];
  const steps = resType === "EVENT" ? stepsForEvent : stepsForStay;

  function canProceed() {
    if (step === 0) return !!resType;
    if (resType === "STAY") {
      if (step === 1) return !!roomId && nights > 0;
      if (step === 2) return !!firstName && !!lastName;
      if (step === 3) return pricePerNight > 0;
    } else {
      if (step === 1) return !!eventSpaceId && !!eventDate && !!eventStart && !!eventEnd;
      if (step === 2) return !!firstName && !!lastName;
      if (step === 3) return basePrice > 0;
    }
    return true;
  }

  function handleSubmit() {
    startTransition(async () => {
      const guest = { firstName, lastName, phone, email, idNumber };
      const payload: CreateReservationInput =
        resType === "STAY"
          ? {
              type: "STAY",
              guest,
              source: source as BookingSource,
              basePrice: stayBase,
              extraCharges,
              discount,
              depositAmount,
              paymentMethod: paymentMethod as PaymentMethod,
              notes,
              roomId,
              checkIn: new Date(checkIn).toISOString(),
              checkOut: new Date(checkOut).toISOString(),
              adults,
              children,
            }
          : {
              type: "EVENT",
              guest,
              source: source as BookingSource,
              basePrice,
              extraCharges,
              discount,
              depositAmount,
              paymentMethod: paymentMethod as PaymentMethod,
              notes,
              eventType: eventType as EventType,
              eventName,
              eventSpaceId,
              eventDate: new Date(eventDate).toISOString(),
              eventStart,
              eventEnd,
              guestCount,
              services,
            };

      const result = await createReservation(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Reservation ${result.code} created`);
      onOpenChange(false);
      router.push(`/reservations/${result.id}`);
      router.refresh();
    });
  }

  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Create reservation</DialogTitle>
          <DialogDescription>Book a stay or an event for Dar Henani.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 px-6 pb-2">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                  i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn("hidden text-xs sm:inline", i === step ? "text-text-primary font-medium" : "text-muted-foreground")}>
                {label}
              </span>
              {i < steps.length - 1 && <div className="h-px w-4 bg-border-strong sm:w-6" />}
            </div>
          ))}
        </div>

        <div className="min-h-[320px] px-6 py-2">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setResType("STAY")}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-[var(--radius-md)] border-2 p-8 transition-colors",
                  resType === "STAY" ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"
                )}
              >
                <BedDouble className="h-8 w-8 text-primary" />
                <span className="font-display text-lg">Stay</span>
                <span className="text-center text-xs text-text-secondary">Room accommodation booking</span>
              </button>
              <button
                onClick={() => setResType("EVENT")}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-[var(--radius-md)] border-2 p-8 transition-colors",
                  resType === "EVENT" ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"
                )}
              >
                <PartyPopper className="h-8 w-8 text-primary" />
                <span className="font-display text-lg">Event</span>
                <span className="text-center text-xs text-text-secondary">Wedding, henna, birthday & more</span>
              </button>
            </div>
          )}

          {resType === "STAY" && step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup>
                  <Label>Check-in</Label>
                  <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                </FieldGroup>
                <FieldGroup>
                  <Label>Check-out</Label>
                  <Input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} />
                </FieldGroup>
              </div>
              <p className="text-sm text-text-secondary">{nights > 0 ? `${nights} night${nights > 1 ? "s" : ""}` : "Select valid dates"}</p>

              <div>
                <Label>Available rooms</Label>
                {loadingRooms ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-text-secondary"><Loader2 className="h-4 w-4 animate-spin" /> Checking availability…</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {rooms.map((room) => (
                      <button
                        key={room.id}
                        disabled={!room.isAvailable}
                        onClick={() => {
                          setRoomId(room.id);
                          setPricePerNight(room.pricePerNight);
                        }}
                        className={cn(
                          "flex flex-col gap-1 rounded-[var(--radius-md)] border p-3.5 text-left transition-colors",
                          !room.isAvailable && "cursor-not-allowed opacity-40",
                          roomId === room.id ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text-primary">{room.name}</span>
                          {!room.isAvailable && <Badge variant="error">Booked</Badge>}
                        </div>
                        <span className="text-xs text-text-secondary">{room.roomType?.name ?? "Room"} · Sleeps {room.capacity}</span>
                        <span className="text-sm font-medium text-primary">{formatCurrency(room.pricePerNight)} / night</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {resType === "EVENT" && step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup>
                  <Label>Event type</Label>
                  <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                    {EVENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </FieldGroup>
                <FieldGroup>
                  <Label>Event name</Label>
                  <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Sara's Henna Night" />
                </FieldGroup>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FieldGroup>
                  <Label>Date</Label>
                  <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </FieldGroup>
                <FieldGroup>
                  <Label>Start time</Label>
                  <Input type="time" value={eventStart} onChange={(e) => setEventStart(e.target.value)} />
                </FieldGroup>
                <FieldGroup>
                  <Label>End time</Label>
                  <Input type="time" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} />
                </FieldGroup>
              </div>
              <FieldGroup className="max-w-[200px]">
                <Label>Number of guests</Label>
                <Input type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} />
              </FieldGroup>

              <div>
                <Label>Event space</Label>
                {loadingSpaces ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-text-secondary"><Loader2 className="h-4 w-4 animate-spin" /> Checking availability…</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {eventSpaces.map((space) => (
                      <button
                        key={space.id}
                        disabled={!space.isAvailable}
                        onClick={() => setEventSpaceId(space.id)}
                        className={cn(
                          "flex flex-col gap-1 rounded-[var(--radius-md)] border p-3.5 text-left transition-colors",
                          !space.isAvailable && "cursor-not-allowed opacity-40",
                          eventSpaceId === space.id ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text-primary">{space.name}</span>
                          {!space.isAvailable && <Badge variant="error">Booked</Badge>}
                        </div>
                        {space.capacity && <span className="text-xs text-text-secondary">Up to {space.capacity} guests</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup>
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </FieldGroup>
                <FieldGroup>
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </FieldGroup>
                <FieldGroup>
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6..." />
                </FieldGroup>
                <FieldGroup>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </FieldGroup>
                <FieldGroup>
                  <Label>CIN / Passport</Label>
                  <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                </FieldGroup>
                {resType === "STAY" && (
                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup>
                      <Label>Adults</Label>
                      <Input type="number" min={1} value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Children</Label>
                      <Input type="number" min={0} value={children} onChange={(e) => setChildren(Number(e.target.value))} />
                    </FieldGroup>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <FieldGroup className="max-w-xs">
                <Label>Booking source</Label>
                <Select value={source} onChange={(e) => setSource(e.target.value)}>
                  {SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </FieldGroup>

              {resType === "STAY" ? (
                <div className="grid grid-cols-2 gap-4">
                  <FieldGroup>
                    <Label>Price / night</Label>
                    <Input type="number" min={0} value={pricePerNight} onChange={(e) => setPricePerNight(Number(e.target.value))} />
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Nights</Label>
                    <Input value={nights} disabled />
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Extra charges</Label>
                    <Input type="number" min={0} value={extraCharges} onChange={(e) => setExtraCharges(Number(e.target.value))} />
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Discount</Label>
                    <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                  </FieldGroup>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup>
                      <Label>Base price</Label>
                      <Input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} />
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Extra services cost</Label>
                      <Input type="number" min={0} value={extraCharges} onChange={(e) => setExtraCharges(Number(e.target.value))} />
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Discount</Label>
                      <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                    </FieldGroup>
                  </div>
                  <div>
                    <Label>Optional services</Label>
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_OPTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            services.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border-strong text-text-secondary hover:bg-muted"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-[var(--radius-md)] bg-muted p-4 text-sm">
                <div className="flex justify-between py-0.5"><span className="text-text-secondary">Subtotal</span><span>{formatCurrency(resType === "STAY" ? stayBase : basePrice)}</span></div>
                <div className="flex justify-between py-0.5"><span className="text-text-secondary">Extra charges</span><span>+ {formatCurrency(extraCharges)}</span></div>
                <div className="flex justify-between py-0.5"><span className="text-text-secondary">Discount</span><span>- {formatCurrency(discount)}</span></div>
                <div className="mt-1 flex justify-between border-t border-border-strong pt-1.5 font-medium text-text-primary"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup>
                  <Label>Total amount</Label>
                  <Input value={formatCurrency(total)} disabled />
                </FieldGroup>
                <FieldGroup>
                  <Label>Deposit / amount paid</Label>
                  <Input type="number" min={0} max={total} value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} />
                </FieldGroup>
                <FieldGroup>
                  <Label>Remaining balance</Label>
                  <Input value={formatCurrency(remaining)} disabled />
                </FieldGroup>
                <FieldGroup>
                  <Label>Payment method</Label>
                  <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </FieldGroup>
              </div>
              <FieldGroup>
                <Label>Notes</Label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests or internal notes…" />
              </FieldGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={pending}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {!isLast ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Reservation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
