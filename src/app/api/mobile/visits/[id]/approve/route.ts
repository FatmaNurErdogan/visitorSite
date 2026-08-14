import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser, type MobileTokenPayload } from "@/lib/mobileAuth";
import { approveVisitCore, approveVisitByAdminCore } from "@/actions/visits";
import { isRecordNotFoundError } from "@/lib/prismaErrors";

// Departman admin'inin son onayını verebilir mi kontrolü — web tarafındaki
// requireDepartmentAdminOrSuperAdmin'in mobil (JWT) karşılığı.
async function canGiveFinalApproval(user: MobileTokenPayload, hostEmployeeId: string) {
  if (user.role !== "ADMIN") return false;
  const admin = await prisma.staff.findUnique({ where: { id: user.sub } });
  if (!admin) return false;
  if (admin.department === null) return true;
  const host = await prisma.staff.findUnique({ where: { id: hostEmployeeId } });
  return host?.department === admin.department;
}

// İki aşamalı onay: PENDING -> personel (ya da herhangi bir admin) onaylar,
// PENDING_ADMIN_APPROVAL -> sadece o departmanın (ya da genel) admin'i onaylar
// ve ancak o zaman ziyaretçiye mail gider.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 401 });
  }

  const { id } = await params;
  const visit = await prisma.visit.findUnique({ where: { id } });
  if (!visit) {
    return NextResponse.json({ error: "Ziyaret bulunamadı." }, { status: 404 });
  }

  try {
    if (visit.status === "PENDING") {
      if (user.role !== "ADMIN" && user.sub !== visit.hostEmployeeId) {
        return NextResponse.json({ error: "Bu ziyaret talebine yanıt verme yetkiniz yok." }, { status: 403 });
      }
      await approveVisitCore(id);
    } else if (visit.status === "PENDING_ADMIN_APPROVAL") {
      if (!(await canGiveFinalApproval(user, visit.hostEmployeeId))) {
        return NextResponse.json(
          { error: "Bu ziyaret talebine son onayı verme yetkiniz yok." },
          { status: 403 }
        );
      }
      await approveVisitByAdminCore(id);
    } else {
      return NextResponse.json({ error: "Bu ziyaret talebi zaten işlendi." }, { status: 409 });
    }
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "Bu ziyaret talebi zaten işlendi." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
