import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobileAuth";
import { approveVisitCore } from "@/actions/visits";
import { isRecordNotFoundError } from "@/lib/prismaErrors";

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

  try {
    await approveVisitCore(id);
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "This visit request has already been processed." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
