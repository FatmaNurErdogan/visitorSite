import { prisma } from "@/lib/prisma";

// Chat is open once a host has accepted the visit, and stays open through
// check-in/check-out — there's no one to talk to before that, and the
// conversation can still matter for a bit after the visitor leaves.
const OPEN_STATUSES = ["ACCEPTED", "CHECKED_IN", "CHECKED_OUT"];

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
