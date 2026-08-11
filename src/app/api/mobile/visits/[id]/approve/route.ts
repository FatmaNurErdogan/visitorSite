import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobileAuth";
import { submitVisitApprovalCore } from "@/actions/rooms";

// Not: yaklaşan bir Flutter güncellemesi gerektiriyor — mobil client artık
// body'de roomId/endTime göndermeli (web'deki oda talebi akışıyla aynı
// kural). Göndermezse submitVisitApprovalCore "Please select a meeting
// room." hatasıyla 400 döner.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const visit = await prisma.visit.findUnique({ where: { id } });
  if (!visit) {
    return NextResponse.json({ error: "Visit not found." }, { status: 404 });
  }

  if (user.role !== "ADMIN" && user.sub !== visit.hostEmployeeId) {
    return NextResponse.json({ error: "Not authorized to respond to this visit request." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const roomId = body?.roomId as string | undefined;
  const endTime = body?.endTime as string | undefined;

  const result = await submitVisitApprovalCore(id, user.role, user.sub, roomId ?? "", endTime ?? "");
  if (result.error) {
    const status = result.error === "This visit request has already been processed." ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true });
}
