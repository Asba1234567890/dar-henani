// Seed / demo data for Dar Henani PMS — clearly demo, safe to reset.
/* eslint-disable @typescript-eslint/no-explicit-any -- loosely-typed seed helpers, not shipped in the app bundle */
import { PrismaClient } from "@prisma/client";
import { addDays, subDays, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Dar Henani demo data...");

  await prisma.payment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.roomAmenity.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.eventSpace.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.propertySettings.deleteMany();

  const admin = await prisma.user.create({
    data: { name: "Amine Ezaiza", email: "amineezaizaa@gmail.com", role: "ADMIN" },
  });
  const staff = await prisma.user.create({
    data: { name: "Fatima Zahra", email: "fatima@darhenani.example", role: "STAFF" },
  });

  const amenityNames = ["WiFi", "Air conditioning", "Private bathroom", "Terrace", "Fireplace", "Rooftop view", "Minibar"];
  const amenities = await Promise.all(amenityNames.map((name) => prisma.amenity.create({ data: { name } })));
  const amenity = (name: string) => amenities.find((a) => a.name === name)!;

  const suiteType = await prisma.roomType.create({ data: { name: "Suite", description: "Spacious suite with courtyard access." } });
  const doubleType = await prisma.roomType.create({ data: { name: "Double Room", description: "Classic double room." } });
  const riadType = await prisma.roomType.create({ data: { name: "Riad Room", description: "Traditional Moroccan-style room." } });

  const roomsData = [
    { name: "Jasmine Suite", roomTypeId: suiteType.id, capacity: 3, pricePerNight: 1400, status: "AVAILABLE" as const, description: "Our signature suite overlooking the inner courtyard, with a private terrace.", amenities: ["WiFi", "Air conditioning", "Private bathroom", "Terrace", "Rooftop view"] },
    { name: "Amber Suite", roomTypeId: suiteType.id, capacity: 3, pricePerNight: 1350, status: "OCCUPIED" as const, description: "Warm-toned suite with a fireplace and reading nook.", amenities: ["WiFi", "Air conditioning", "Private bathroom", "Fireplace"] },
    { name: "Orange Blossom Room", roomTypeId: doubleType.id, capacity: 2, pricePerNight: 850, status: "AVAILABLE" as const, description: "Bright double room with garden views.", amenities: ["WiFi", "Air conditioning", "Private bathroom"] },
    { name: "Rose Room", roomTypeId: doubleType.id, capacity: 2, pricePerNight: 850, status: "CLEANING" as const, description: "Cozy double room near the courtyard.", amenities: ["WiFi", "Private bathroom"] },
    { name: "Cedar Riad Room", roomTypeId: riadType.id, capacity: 2, pricePerNight: 700, status: "AVAILABLE" as const, description: "Traditional room with hand-carved cedar details.", amenities: ["WiFi", "Private bathroom"] },
    { name: "Saffron Riad Room", roomTypeId: riadType.id, capacity: 2, pricePerNight: 700, status: "MAINTENANCE" as const, description: "Traditional room, currently under refurbishment.", amenities: ["WiFi"] },
    { name: "Mint Room", roomTypeId: doubleType.id, capacity: 2, pricePerNight: 800, status: "AVAILABLE" as const, description: "Fresh, minimalist double room.", amenities: ["WiFi", "Air conditioning", "Private bathroom", "Minibar"] },
    { name: "Terrace Loft", roomTypeId: suiteType.id, capacity: 4, pricePerNight: 1600, status: "AVAILABLE" as const, description: "Top-floor loft with a private rooftop terrace, ideal for families.", amenities: ["WiFi", "Air conditioning", "Private bathroom", "Terrace", "Rooftop view", "Minibar"] },
  ];

  const rooms = [];
  for (const r of roomsData) {
    const { amenities: amenityList, ...roomFields } = r;
    const room = await prisma.room.create({ data: roomFields });
    await prisma.roomAmenity.createMany({
      data: amenityList.map((name) => ({ roomId: room.id, amenityId: amenity(name).id })),
    });
    rooms.push(room);
  }

  const courtyard = await prisma.eventSpace.create({ data: { name: "Main Courtyard", capacity: 120, description: "Open-air courtyard for weddings and large celebrations." } });
  const rooftop = await prisma.eventSpace.create({ data: { name: "Rooftop Terrace", capacity: 60, description: "Panoramic rooftop for henna nights and dinners." } });
  const lounge = await prisma.eventSpace.create({ data: { name: "Salon Lounge", capacity: 30, description: "Intimate indoor salon for private gatherings." } });

  const guestNames = [
    ["Sara", "El Amrani"], ["Youssef", "Bennis"], ["Laila", "Idrissi"], ["Karim", "Tazi"],
    ["Nadia", "Chraibi"], ["Omar", "Fassi"], ["Imane", "Berrada"], ["Hamza", "Alaoui"],
    ["Sophia", "Martin"], ["James", "Carter"], ["Elena", "Rossi"], ["Marc", "Dubois"],
  ];
  const guests = await Promise.all(
    guestNames.map(([firstName, lastName], i) =>
      prisma.guest.create({
        data: {
          firstName,
          lastName,
          phone: `+212 6${(10000000 + i * 137).toString().slice(0, 8)}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          idNumber: `ID${1000 + i}`,
        },
      })
    )
  );

  const today = startOfDay(new Date());
  let seq = 0;
  const nextCode = () => `DH-${today.getFullYear()}-${String(++seq).padStart(4, "0")}`;

  async function createStay({
    guest, room, checkIn, checkOut, status, source, adults = 2, children = 0,
    pricePerNight, discount = 0, extraCharges = 0, paidRatio, method = "CASH" as const, createdBy = staff,
  }: any) {
    const nights = Math.max(Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000), 1);
    const basePrice = pricePerNight * nights;
    const totalAmount = Math.max(basePrice + extraCharges - discount, 0);
    const reservation = await prisma.reservation.create({
      data: {
        code: nextCode(), type: "STAY", status, guestId: guest.id, roomId: room.id,
        checkIn, checkOut, adults, children, source, basePrice, extraCharges, discount, totalAmount,
        createdById: createdBy.id, notes: null,
      },
    });
    const amountPaid = Math.round(totalAmount * paidRatio);
    if (amountPaid > 0) {
      await prisma.payment.create({ data: { reservationId: reservation.id, amount: amountPaid, method, recordedById: createdBy.id } });
    }
    return reservation;
  }

  async function createEvent({
    guest, eventSpace, eventType, eventName, eventDate, eventStart, eventEnd, guestCount, status,
    source, basePrice, extraCharges = 0, discount = 0, paidRatio, method = "BANK_TRANSFER" as const, createdBy = admin, services = [],
  }: any) {
    const totalAmount = Math.max(basePrice + extraCharges - discount, 0);
    const reservation = await prisma.reservation.create({
      data: {
        code: nextCode(), type: "EVENT", status, guestId: guest.id, eventSpaceId: eventSpace.id,
        eventType, eventName, eventDate, eventStart, eventEnd, guestCount, source,
        basePrice, extraCharges, discount, totalAmount, services: JSON.stringify(services),
        createdById: createdBy.id,
      },
    });
    const amountPaid = Math.round(totalAmount * paidRatio);
    if (amountPaid > 0) {
      await prisma.payment.create({ data: { reservationId: reservation.id, amount: amountPaid, method, recordedById: createdBy.id } });
    }
    return reservation;
  }

  // Today's arrivals
  await createStay({ guest: guests[0], room: rooms[0], checkIn: today, checkOut: addDays(today, 3), status: "CONFIRMED", source: "BOOKING_COM", pricePerNight: rooms[0].pricePerNight, paidRatio: 0.3 });
  await createStay({ guest: guests[1], room: rooms[2], checkIn: today, checkOut: addDays(today, 2), status: "CONFIRMED", source: "DIRECT", pricePerNight: rooms[2].pricePerNight, paidRatio: 1 });

  // Currently staying (checked in, spanning today)
  await createStay({ guest: guests[2], room: rooms[1], checkIn: subDays(today, 1), checkOut: addDays(today, 2), status: "CHECKED_IN", source: "AIRBNB", pricePerNight: rooms[1].pricePerNight, paidRatio: 0.5 });

  // Today's departures
  await createStay({ guest: guests[3], room: rooms[6], checkIn: subDays(today, 3), checkOut: today, status: "CHECKED_IN", source: "WALK_IN", pricePerNight: rooms[6].pricePerNight, paidRatio: 0.6 });

  // Upcoming
  await createStay({ guest: guests[4], room: rooms[4], checkIn: addDays(today, 4), checkOut: addDays(today, 7), status: "CONFIRMED", source: "PHONE", pricePerNight: rooms[4].pricePerNight, paidRatio: 0.3 });
  await createStay({ guest: guests[5], room: rooms[7], checkIn: addDays(today, 10), checkOut: addDays(today, 13), status: "PENDING", source: "WHATSAPP", pricePerNight: rooms[7].pricePerNight, paidRatio: 0 });

  // Past / checked-out history
  await createStay({ guest: guests[6], room: rooms[0], checkIn: subDays(today, 10), checkOut: subDays(today, 7), status: "CHECKED_OUT", source: "BOOKING_COM", pricePerNight: rooms[0].pricePerNight, paidRatio: 1 });
  await createStay({ guest: guests[7], room: rooms[3], checkIn: subDays(today, 20), checkOut: subDays(today, 18), status: "CANCELLED", source: "OTHER", pricePerNight: rooms[3].pricePerNight, paidRatio: 0.2 });
  await createStay({ guest: guests[8], room: rooms[2], checkIn: subDays(today, 5), checkOut: subDays(today, 2), status: "NO_SHOW", source: "DIRECT", pricePerNight: rooms[2].pricePerNight, paidRatio: 0 });

  // Events today
  await createEvent({
    guest: guests[9], eventSpace: courtyard, eventType: "HENNA", eventName: "Sophia's Henna Night",
    eventDate: today, eventStart: "18:00", eventEnd: "23:00", guestCount: 80, status: "CONFIRMED",
    source: "DIRECT", basePrice: 18000, extraCharges: 3000, discount: 1000, paidRatio: 0.4,
    services: ["Catering", "Decoration", "Music"],
  });

  // Upcoming events
  await createEvent({
    guest: guests[10], eventSpace: rooftop, eventType: "BIRTHDAY", eventName: "Elena's 30th Birthday",
    eventDate: addDays(today, 6), eventStart: "19:00", eventEnd: "23:30", guestCount: 40, status: "CONFIRMED",
    source: "WHATSAPP", basePrice: 9000, extraCharges: 1200, discount: 0, paidRatio: 0.3,
    services: ["Catering", "Music", "Photography"],
  });
  await createEvent({
    guest: guests[11], eventSpace: courtyard, eventType: "WEDDING", eventName: "Dubois Wedding Reception",
    eventDate: addDays(today, 25), eventStart: "17:00", eventEnd: "01:00", guestCount: 150, status: "PENDING",
    source: "PHONE", basePrice: 45000, extraCharges: 8000, discount: 2000, paidRatio: 0.2,
    services: ["Catering", "Decoration", "Music", "Photography"],
  });
  await createEvent({
    guest: guests[8], eventSpace: lounge, eventType: "CORPORATE", eventName: "Riad Import Co. Dinner",
    eventDate: subDays(today, 15), eventStart: "20:00", eventEnd: "23:00", guestCount: 25, status: "CHECKED_OUT",
    source: "OTHER", basePrice: 6000, extraCharges: 0, discount: 0, paidRatio: 1,
    services: ["Catering"],
  });

  // A handful of extra historical reservations for analytics richness
  for (let i = 0; i < 12; i++) {
    const guest = guests[i % guests.length];
    const room = rooms[i % rooms.length];
    const start = subDays(today, 30 + i * 5);
    await createStay({
      guest, room, checkIn: start, checkOut: addDays(start, 1 + (i % 4)),
      status: "CHECKED_OUT", source: (["BOOKING_COM", "AIRBNB", "DIRECT", "WALK_IN"] as const)[i % 4],
      pricePerNight: room.pricePerNight, paidRatio: 1,
    });
  }

  await prisma.expense.createMany({
    data: [
      { category: "Utilities", description: "Electricity & water", amount: 3200, date: subDays(today, 2), recordedById: admin.id },
      { category: "Supplies", description: "Linens and toiletries", amount: 1500, date: subDays(today, 5), recordedById: staff.id },
      { category: "Maintenance", description: "Plumbing repair - Saffron Room", amount: 900, date: subDays(today, 1), recordedById: admin.id },
      { category: "Staff", description: "Event staff overtime", amount: 2200, date: subDays(today, 10), recordedById: admin.id },
    ],
  });

  await prisma.propertySettings.create({
    data: {
      id: "default",
      propertyName: "Dar Henani",
      address: "12 Derb Chérifa, Marrakech Medina, Morocco",
      phone: "+212 5 24 00 00 00",
      email: "reservations@darhenani.example",
      currency: "MAD",
      checkInTime: "14:00",
      checkOutTime: "12:00",
      cancellationPolicy: "Free cancellation up to 48 hours before check-in. Deposits are non-refundable within 48 hours.",
      defaultDepositPercent: 30,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
