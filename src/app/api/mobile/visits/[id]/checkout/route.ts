import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobileAuth";
import { checkOutVisitCore } from "@/actions/visits";
import { isRecordNotFoundError } from "@/lib/prismaErrors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 401 });
  }

  if (user.role !== "RECEPTIONIST") {
    return NextResponse.json({ error: "Ziyaretçi çıkışını onaylama yetkiniz yok." }, { status: 403 });
  }

  const { id } = await params;

  try {
    await checkOutVisitCore(id);
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "Bu ziyaret çıkış onayı beklemiyor (zaten işlenmiş ya da bulunamadı)." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
