import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobileAuth";

// staff/dashboard sayfasının eşleniği: role'e göre "onayını bekleyenler" ve
// "bugünün ziyaretleri" listelerini tek istekte döner.
export async function GET(req: Request) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 401 });
  }

  const { role, sub: userId } = user;
  const showApprovals = role === "EMPLOYEE" || role === "ADMIN";
  const showAdminApprovals = role === "ADMIN";
  const showTodaysVisits = role === "RECEPTIONIST";

  const pendingApprovals = showApprovals
    ? await prisma.visit.findMany({
        where: {
          status: "PENDING",
          ...(role === "ADMIN" ? {} : { hostEmployeeId: userId }),
        },
        include: { visitor: true, hostEmployee: { select: { id: true, name: true, email: true } } },
        orderBy: { requestedAt: "asc" },
      })
    : [];

  const currentAdmin = showAdminApprovals ? await prisma.staff.findUnique({ where: { id: userId } }) : null;
  const pendingAdminApprovals = showAdminApprovals
    ? await prisma.visit.findMany({
        where: {
          status: "PENDING_ADMIN_APPROVAL",
          ...(currentAdmin?.department ? { hostEmployee: { department: currentAdmin.department } } : {}),
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

  return NextResponse.json({ pendingApprovals, pendingAdminApprovals, todaysVisits });
}
