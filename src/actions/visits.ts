"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { type Visit } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import {
  sendHostRequestNotification,
  sendVisitorArrivedNotification,
  sendVisitorDepartedNotification,
} from "@/lib/email/notifyHost";
import { sendVisitorDecisionNotification } from "@/lib/email/notifyVisitor";

export type VisitRequestState = {
  error?: string;
  success?: boolean;
};

export type CreateVisitRequestInput = {
  name: string;
  phone: string;
  email: string;
  company?: string;
  hostEmployeeId: string;
  visitReason: string;
  scheduledAt: string;
};

export type CreateVisitRequestResult =
  | { error: string; success?: undefined; visit?: undefined }
  | { success: true; error?: undefined; visit: Visit };

// Ziyaret talebini oluşturan asıl mantık: doğrulama + visitor/visit kaydı +
// host'a email bildirimi. Hem web form action'ı hem mobil API route'u
// (src/app/api/mobile/visits) bunu çağırır.
export async function createVisitRequestCore(input: CreateVisitRequestInput): Promise<CreateVisitRequestResult> {
  const { name, phone, email, company, hostEmployeeId, visitReason } = input;
  const scheduledAtRaw = input.scheduledAt;

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
  // Randevular sadece mesai saatleri içinde alınabilir.
  const hour = scheduledAt.getHours();
  if (hour < 9 || hour >= 18) {
    return { error: "Please pick a time between 9:00 and 18:00." };
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

  return { success: true, visit };
}

export async function createVisitRequest(
  _prevState: VisitRequestState | undefined,
  formData: FormData
): Promise<VisitRequestState> {
  const result = await createVisitRequestCore({
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    company: (formData.get("company") as string) || undefined,
    hostEmployeeId: formData.get("hostEmployeeId") as string,
    visitReason: formData.get("visitReason") as string,
    scheduledAt: formData.get("scheduledAt") as string,
  });

  if (result.success) {
    revalidatePath("/staff/dashboard");
    revalidatePath("/staff/visits");
    return { success: true };
  }

  return { error: result.error };
}

async function requireHostOrAdmin(hostEmployeeId: string) {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;
  if (!session || (role !== "ADMIN" && userId !== hostEmployeeId)) {
    throw new Error("Not authorized to respond to this visit request.");
  }
}

// Giriş/çıkış onayı sadece RECEPTIONIST'in işi — ADMIN dahil başka hiçbir
// rol bunu yapamaz (bkz. dashboard'daki "Bugünün ziyaretleri" bölümü de
// aynı sebeple sadece RECEPTIONIST'e gösteriliyor).
async function requireReceptionist() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || role !== "RECEPTIONIST") {
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
    await sendVisitorDecisionNotification(
      visit.visitor.email,
      visit.visitor.name,
      visit.hostEmployee.name,
      decision,
      visit.accessToken
    );
  } catch (error) {
    console.error(`Failed to send visitor decision notification for visit ${visitId}:`, error);
  }
}

// --- Core mutasyonlar: sadece DB güncellemesi + email bildirimi.
// Yetki kontrolü (requireHostOrAdmin / requireReceptionist) ve
// revalidatePath çağıranın (Server Action ya da mobil API route) işi.

export async function approveVisitCore(visitId: string) {
  await prisma.visit.update({
    where: { id: visitId, status: "PENDING" },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });
  await notifyVisitorOfDecision(visitId, "ACCEPTED");
}

export async function rejectVisitCore(visitId: string) {
  await prisma.visit.update({
    where: { id: visitId, status: "PENDING" },
    data: { status: "REJECTED", respondedAt: new Date() },
  });
  await notifyVisitorOfDecision(visitId, "REJECTED");
}

export async function checkInVisitCore(visitId: string) {
  const visit = await prisma.visit.update({
    where: { id: visitId, status: "ACCEPTED" },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
    include: { visitor: true, hostEmployee: true },
  });

  try {
    await sendVisitorArrivedNotification(visit.hostEmployee.email, visit.visitor.name);
  } catch (error) {
    console.error(`Failed to send arrival notification for visit ${visitId}:`, error);
  }
}

export async function checkOutVisitCore(visitId: string) {
  const visit = await prisma.visit.update({
    where: { id: visitId, status: "CHECKED_IN" },
    data: { status: "CHECKED_OUT", checkedOutAt: new Date() },
    include: { visitor: true, hostEmployee: true },
  });

  try {
    await sendVisitorDepartedNotification(visit.hostEmployee.email, visit.visitor.name);
  } catch (error) {
    console.error(`Failed to send departure notification for visit ${visitId}:`, error);
  }
}

export async function approveVisit(visitId: string) {
  const visit = await prisma.visit.findUniqueOrThrow({ where: { id: visitId } });
  await requireHostOrAdmin(visit.hostEmployeeId);

  try {
    await approveVisitCore(visitId);
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
    await rejectVisitCore(visitId);
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
}

export async function checkInVisit(visitId: string) {
  await requireReceptionist();

  try {
    await checkInVisitCore(visitId);
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
}

export async function checkOutVisit(visitId: string) {
  await requireReceptionist();

  try {
    await checkOutVisitCore(visitId);
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
}
