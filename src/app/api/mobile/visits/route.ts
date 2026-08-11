import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobileAuth";
import { createVisitRequestCore } from "@/actions/visits";

// Tüm ziyaret log'u, opsiyonel ?status= filtresiyle — staff/visits sayfasının
// eşleniği. Herhangi bir giriş yapmış personel görebilir (web'deki gibi).
export async function GET(req: Request) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = new URL(req.url).searchParams.get("status") || undefined;

  const visits = await prisma.visit.findMany({
    where: status ? { status } : undefined,
    include: { visitor: true, hostEmployee: { select: { id: true, name: true, email: true } } },
    orderBy: { scheduledAt: "desc" },
  });

  return NextResponse.json({ visits });
}

// Ziyaretçinin talep formu — auth gerektirmez.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await createVisitRequestCore({
    name: body.name,
    phone: body.phone,
    email: body.email,
    company: body.company || undefined,
    hostEmployeeId: body.hostEmployeeId,
    visitReason: body.visitReason,
    scheduledAt: body.scheduledAt,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ visit: result.visit, scheduleConflict: result.scheduleConflict ?? false }, { status: 201 });
}
