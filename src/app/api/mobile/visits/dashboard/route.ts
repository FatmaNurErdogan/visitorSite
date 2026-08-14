import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobileAuth";

// staff/dashboard sayfasının eşleniği: role'e göre "onayını bekleyenler" ve
// "bugünün ziyaretleri" listelerini tek istekte döner.
export async function GET(req: Request) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, sub: userId } = user;
  const showApprovals = role === "EMPLOYEE" || role === "ADMIN";
  // Giriş/çıkış onayı sadece RECEPTIONIST'in işi — ADMIN dahil burada değil
  // (bkz. src/actions/visits.ts requireReceptionist).
  const showTodaysVisits = role === "RECEPTIONIST";

  // Herkes (ADMIN dahil) burada sadece kendi host olduğu ziyaretleri görür —
  // bkz. web dashboard'daki aynı yorum (src/app/staff/dashboard/page.tsx).
  const pendingApprovals = showApprovals
    ? await prisma.visit.findMany({
        where: {
          status: "PENDING",
          hostEmployeeId: userId,
        },
        include: { visitor: true, hostEmployee: { select: { id: true, name: true, email: true } } },
        orderBy: { requestedAt: "asc" },
      })
    : [];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todaysVisits = showTodaysVisits
    ? await prisma.visit.findMany({
        where: {
          OR: [
            { status: { in: ["ACCEPTED", "CHECKED_IN"] } },
            { status: "PENDING", scheduledAt: { gte: startOfToday, lte: endOfToday } },
          ],
        },
        include: { visitor: true, hostEmployee: { select: { id: true, name: true, email: true } } },
        orderBy: { scheduledAt: "asc" },
      })
    : [];

  return NextResponse.json({ pendingApprovals, todaysVisits });
}
