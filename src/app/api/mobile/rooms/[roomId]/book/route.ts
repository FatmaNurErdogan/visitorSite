import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobileAuth";
import { createRoomBookingCore } from "@/actions/rooms";

// /staff/rooms/[roomId]/book sayfasının mobil eşleniği — herhangi bir
// personel bağımsız bir oda rezervasyonu talep edebilir. Oda o saatte
// doluysa (başka bir APPROVED rezervasyon varsa) 400 döner, kişi farklı bir
// saat seçmek zorunda kalır.
export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await createRoomBookingCore({
    roomId,
    purpose: body.purpose,
    startTime: body.startTime,
    endTime: body.endTime,
    requestedById: user.sub,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
