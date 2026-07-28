"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendHostRequestNotification } from "@/lib/email/notifyHost";
import { sendVisitorDecisionNotification } from "@/lib/email/notifyVisitor";

// Prisma'nın "update where" koşulu (id + belirli bir status) eşleşen satır
// bulamazsa fırlattığı hata. Bu genelde iki kişi/iki sekme aynı ziyareti
// aynı anda işlemeye çalıştığında olur — durum zaten değişmiş demektir.
// Uygulamayı çökertmek yerine sessizce görmezden geliyoruz, sayfa zaten
// revalidatePath ile yenilenip güncel durumu gösterecek.
function isRecordNotFoundError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

export type VisitRequestState = {
  error?: string;
  success?: boolean;
};

export async function createVisitRequest(
  _prevState: VisitRequestState | undefined,
  formData: FormData
): Promise<VisitRequestState> {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const company = (formData.get("company") as string) || undefined;
  const hostEmployeeId = formData.get("hostEmployeeId") as string;
  const visitReason = formData.get("visitReason") as string;
  const scheduledAtRaw = formData.get("scheduledAt") as string;

  if (!name || !phone || !email || !hostEmployeeId || !visitReason || !scheduledAtRaw) {
    return { error: "Please fill in all required fields." };
  }

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: "Please provide a valid date and time." };
  }
  if (scheduledAt.getTime() < Date.now()) {
    return { error: "Please pick a date and time in the future." };
  }

  const host = await prisma.staff.findUnique({ where: { id: hostEmployeeId } });
  if (!host) {
    return { error: "Please select who you're visiting." };
  }

  const visitor = await prisma.visitor.create({
    data: { name, phone, email, company },
  });

  const visit = await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      hostEmployeeId,
      visitReason,
      scheduledAt,
      accessToken: randomUUID(),
      tokenExpiresAt: new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  try {
    await sendHostRequestNotification(host.email, visitor.name, visitReason, scheduledAt);
  } catch (error) {
    console.error(`Failed to send host notification for visit ${visit.id}:`, error);
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");

  return { success: true };
}

async function requireHostOrAdmin(hostEmployeeId: string) {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;
  if (!session || (role !== "ADMIN" && userId !== hostEmployeeId)) {
    throw new Error("Not authorized to respond to this visit request.");
  }
}

async function requireReceptionistOrAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || (role !== "ADMIN" && role !== "RECEPTIONIST")) {
    throw new Error("Not authorized to check visitors in or out.");
  }
}

async function notifyVisitorOfDecision(visitId: string, decision: "ACCEPTED" | "REJECTED") {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { visitor: true, hostEmployee: true },
  });
  if (!visit || !visit.visitor.email) return;

  try {
    await sendVisitorDecisionNotification(visit.visitor.email, visit.visitor.name, visit.hostEmployee.name, decision);
  } catch (error) {
    console.error(`Failed to send visitor decision notification for visit ${visitId}:`, error);
  }
}

export async function approveVisit(visitId: string) {
  const visit = await prisma.visit.findUniqueOrThrow({ where: { id: visitId } });
  await requireHostOrAdmin(visit.hostEmployeeId);

  try {
    await prisma.visit.update({
      where: { id: visitId, status: "PENDING" },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    await notifyVisitorOfDecision(visitId, "ACCEPTED");
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
    // Başka biri (ya da çift tıklama) bu talebi zaten işlemiş, sorun değil.
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
}

export async function rejectVisit(visitId: string) {
  const visit = await prisma.visit.findUniqueOrThrow({ where: { id: visitId } });
  await requireHostOrAdmin(visit.hostEmployeeId);

  try {
    await prisma.visit.update({
      where: { id: visitId, status: "PENDING" },
      data: { status: "REJECTED", respondedAt: new Date() },
    });
    await notifyVisitorOfDecision(visitId, "REJECTED");
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
}

export async function checkInVisit(visitId: string) {
  await requireReceptionistOrAdmin();

  try {
    await prisma.visit.update({
      where: { id: visitId, status: "ACCEPTED" },
      data: { status: "CHECKED_IN", checkedInAt: new Date() },
    });
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
}

export async function checkOutVisit(visitId: string) {
  await requireReceptionistOrAdmin();

  try {
    await prisma.visit.update({
      where: { id: visitId, status: "CHECKED_IN" },
      data: { status: "CHECKED_OUT", checkedOutAt: new Date() },
    });
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
}
