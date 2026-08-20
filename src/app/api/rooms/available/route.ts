import { NextRequest, NextResponse } from "next/server";
import { getAvailableRooms } from "@/lib/reservations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  if (!checkIn || !checkOut) {
    return NextResponse.json({ error: "checkIn and checkOut are required" }, { status: 400 });
  }
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
    return NextResponse.json({ error: "Invalid checkIn or checkOut date." }, { status: 400 });
  }
  if (checkOutDate <= checkInDate) {
    return NextResponse.json({ error: "checkOut must be after checkIn." }, { status: 400 });
  }
  const rooms = await getAvailableRooms(checkInDate, checkOutDate);
  return NextResponse.json({ rooms });
}
