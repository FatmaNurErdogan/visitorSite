import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobileAuth";
import { getRoomBookingsForMonth } from "@/actions/rooms";
import { parseMonthParam } from "@/lib/month";

// /staff/rooms'taki aylık takvimin mobil karşılığı — herhangi bir giriş
// yapmış personel görebilir (bkz. /api/mobile/rooms GET ile aynı yetki).
// ?month=YYYY-MM — verilmezse mevcut ay.
export async function GET(req: Request) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const { year, month, monthStart, monthEnd } = parseMonthParam(searchParams.get("month"));

  const bookings = await getRoomBookingsForMonth(monthStart, monthEnd);

  return NextResponse.json({ year, month, bookings });
}
