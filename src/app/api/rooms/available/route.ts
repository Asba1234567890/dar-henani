import { NextRequest, NextResponse } from "next/server";
import { getAvailableRooms } from "@/lib/reservations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  if (!checkIn || !checkOut) {
    return NextResponse.json({ error: "checkIn and checkOut are required" }, { status: 400 });
  }
  const rooms = await getAvailableRooms(new Date(checkIn), new Date(checkOut));
  return NextResponse.json({ rooms });
}
