import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobileAuth";
import { createMeetingRoomCore } from "@/actions/rooms";

// /staff/rooms sayfasının eşleniği — herhangi bir giriş yapmış personel
// görebilir. Her odanın güncel (APPROVED) rezervasyonlarını da döner ki
// client "Available" / "In use until..." durumunu kendi hesaplayabilsin.
export async function GET(req: Request) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rooms = await prisma.meetingRoom.findMany({
    orderBy: { name: "asc" },
    include: {
      bookings: {
        where: { status: "APPROVED", endTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        include: {
          requestedBy: { select: { id: true, name: true } },
          visit: {
            include: {
              visitor: true,
              hostEmployee: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ rooms });
}

// staff-users sayfasının eşleniği — sadece ADMIN yeni oda ekleyebilir.
export async function POST(req: Request) {
  const user = await getMobileUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: user ? 403 : 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await createMeetingRoomCore({
    name: body.name,
    location: body.location || undefined,
    capacity: typeof body.capacity === "number" ? body.capacity : undefined,
    perks: body.perks || undefined,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
