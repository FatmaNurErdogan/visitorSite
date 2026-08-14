import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobileAuth";
import { cancelDirectRoomBookingCore } from "@/actions/rooms";

// Doğrudan (ziyaretsiz) bir rezervasyonu, süresi dolmadan iptal edip odayı
// erken serbest bırakmak — sadece ADMIN. Ziyarete bağlı booking'ler için
// 400 döner (bkz. cancelDirectRoomBookingCore).
export async function DELETE(req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getMobileUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: user ? 403 : 401 });
  }

  const { bookingId } = await params;
  const result = await cancelDirectRoomBookingCore(bookingId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
