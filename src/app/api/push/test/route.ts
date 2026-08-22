import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { sendPushToUser } from "@/lib/push";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });

  try {
    await sendPushToUser(user.id, {
      title: "Dar Henani — Test",
      body: "Push notifications are working correctly!",
      url: "/dashboard",
      tag: "test",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("test push failed:", err);
    return NextResponse.json({ error: "Failed to send test notification." }, { status: 500 });
  }
}
