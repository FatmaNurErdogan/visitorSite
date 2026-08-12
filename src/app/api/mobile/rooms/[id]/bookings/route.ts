import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobileAuth";
import { createDirectRoomBookingCore } from "@/actions/rooms";

// Bir odayı, herhangi bir ziyaretten bağımsız olarak, gelecekteki istediği
// bir tarih/saat aralığı için doğrudan rezerve etmek — sadece ADMIN.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: user ? 403 : 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await createDirectRoomBookingCore(user.sub, {
    roomId: id,
    purpose: body.purpose,
    startTime: body.startTime,
    endTime: body.endTime,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
