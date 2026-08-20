import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/guards";

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  try {
    // Only delete a subscription the caller actually owns.
    await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push unsubscribe failed:", err);
    return NextResponse.json({ error: "Could not remove the push subscription." }, { status: 500 });
  }
}
