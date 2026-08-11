import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser, type MobileTokenPayload } from "@/lib/mobileAuth";
import { rejectVisitCore, rejectVisitByAdminCore } from "@/actions/visits";
import { isRecordNotFoundError } from "@/lib/prismaErrors";

async function canGiveFinalApproval(user: MobileTokenPayload, hostEmployeeId: string) {
  if (user.role !== "ADMIN") return false;
  const admin = await prisma.staff.findUnique({ where: { id: user.sub } });
  if (!admin) return false;
  if (admin.department === null) return true;
  const host = await prisma.staff.findUnique({ where: { id: hostEmployeeId } });
  return host?.department === admin.department;
}

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

  try {
    if (visit.status === "PENDING") {
      if (user.role !== "ADMIN" && user.sub !== visit.hostEmployeeId) {
        return NextResponse.json({ error: "Not authorized to respond to this visit request." }, { status: 403 });
      }
      await rejectVisitCore(id);
    } else if (visit.status === "PENDING_ADMIN_APPROVAL") {
      if (!(await canGiveFinalApproval(user, visit.hostEmployeeId))) {
        return NextResponse.json(
          { error: "Not authorized to give final approval for this visit request." },
          { status: 403 }
        );
      }
      const body = await req.json().catch(() => null);
      const reason = (body?.reason as string | undefined)?.trim();
      if (!reason) {
        return NextResponse.json({ error: "Please explain why you're rejecting this request." }, { status: 400 });
      }
      await rejectVisitByAdminCore(id, reason);
    } else {
      return NextResponse.json({ error: "This visit request has already been processed." }, { status: 409 });
    }
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "This visit request has already been processed." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
