import { prisma } from "@/lib/prisma";

// Chat is open as soon as the visitor submits the request — no need to wait
// on the host — and stays open through check-in/check-out. Only closed once
// the visit is a dead end (REJECTED/CANCELLED/EXPIRED).
const OPEN_STATUSES = ["PENDING", "ACCEPTED", "CHECKED_IN", "CHECKED_OUT"];

export function isChatOpen(status: string) {
  return OPEN_STATUSES.includes(status);
}

export async function getVisitByAccessToken(token: string) {
  return prisma.visit.findUnique({
    where: { accessToken: token },
    include: { visitor: true, hostEmployee: true },
  });
}

export async function listMessagesCore(visitId: string) {
  return prisma.message.findMany({
    where: { visitId },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendVisitorMessageCore(visitId: string, body: string) {
  return prisma.message.create({
    data: { visitId, senderType: "VISITOR", body },
  });
}

export async function sendStaffMessageCore(visitId: string, staffId: string, body: string) {
  return prisma.message.create({
    data: { visitId, senderType: "STAFF", senderStaffId: staffId, body },
  });
}
