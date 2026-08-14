import { prisma } from "@/lib/prisma";

// Chat is open as soon as the visitor submits the request — no need to wait
// on the host — and stays open through check-in/check-out. Only closed once
// the visit is a dead end (REJECTED/CANCELLED/EXPIRED).
const OPEN_STATUSES = ["PENDING", "ACCEPTED", "CHECKED_IN", "CHECKED_OUT"];

export function isChatOpen(status: string) {
  return OPEN_STATUSES.includes(status);
}

export const MAX_MESSAGE_LENGTH = 2000; // Message.body @db.NVarChar(2000) ile eşleşiyor.

export function validateMessageBody(text: string): string | null {
  if (!text) return "Mesaj boş olamaz.";
  if (text.length > MAX_MESSAGE_LENGTH) return `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`;
  return null;
}

// accessToken linki tokenExpiresAt'ten sonra da (visit hâlâ PENDING/ACCEPTED/...
// olsa bile) süresiz çalışmasın diye — bkz. Visit.tokenExpiresAt.
export function isTokenValid(visit: { tokenExpiresAt: Date }) {
  return Date.now() < visit.tokenExpiresAt.getTime();
}

// Token ile erişilen (ziyaretçi tarafı) sohbetin açık olup olmadığı —
// hem durum hem de linkin süresi dolmamış olmalı. Personel tarafı
// (session ile, /api/staff/visits/[id]/messages) bu kontrole tabi değil,
// sadece isChatOpen(status) kullanır.
export function isChatOpenForVisitor(visit: { status: string; tokenExpiresAt: Date }) {
  return isChatOpen(visit.status) && isTokenValid(visit);
}

export async function getVisitByAccessToken(token: string) {
  const visit = await prisma.visit.findUnique({
    where: { accessToken: token },
    include: { visitor: true, hostEmployee: true },
  });
  if (!visit) return visit;

  // Hiç yanıtlanmamış (PENDING) bir talebin linki süresi dolduysa, durumu
  // EXPIRED'a çevir — bu değer daha önce hiçbir yerde set edilmiyordu.
  // Zaten kabul edilmiş/reddedilmiş/tamamlanmış ziyaretlerin durumunu
  // burada değiştirmiyoruz; onlar için erişim isChatOpenForVisitor
  // üzerinden tokenExpiresAt kontrolüyle zaten kapanıyor.
  if (visit.status === "PENDING" && !isTokenValid(visit)) {
    const expired = await prisma.visit.update({
      where: { id: visit.id, status: "PENDING" },
      data: { status: "EXPIRED" },
      include: { visitor: true, hostEmployee: true },
    }).catch(() => null);
    return expired ?? visit;
  }

  return visit;
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
