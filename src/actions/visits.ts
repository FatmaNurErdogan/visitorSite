"use server";

import { randomUUID } from "crypto";
import { Prisma, type Visit } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError, runSerializable } from "@/lib/prismaErrors";
import {
  sendHostRequestNotification,
  sendHostFinalDecisionNotification,
  sendVisitorArrivedNotification,
  sendVisitorDepartedNotification,
} from "@/lib/email/notifyHost";
import { sendAdminPendingApprovalNotification } from "@/lib/email/notifyAdmin";
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
  scheduledEndAt: string;
};

export type CreateVisitRequestResult =
  | { error: string; success?: undefined; visit?: undefined }
  | { success: true; error?: undefined; visit: Visit };

// Bir host için, verilen [scheduledAt, scheduledEndAt) aralığıyla kesişen,
// henüz sonuçlanmamış (PENDING/PENDING_ADMIN_APPROVAL/ACCEPTED/CHECKED_IN)
// başka bir ziyaret var mı — varsa yeni talep hiç oluşturulmuyor. tx her
// zaman bir Prisma.TransactionClient olmalı (bkz. createVisitRequestCore) —
// aynı rooms.ts'teki roomHasConflict deseninde, SERIALIZABLE izolasyon bu
// SELECT'in aldığı range lock'u commit'e kadar tutarak iki eşzamanlı talebin
// ikisinin de çakışmayı kaçırmasını önlüyor.
async function hostHasRangeConflict(
  tx: Prisma.TransactionClient,
  hostEmployeeId: string,
  scheduledAt: Date,
  scheduledEndAt: Date
) {
  const conflict = await tx.visit.findFirst({
    where: {
      hostEmployeeId,
      status: { in: ["PENDING", "PENDING_ADMIN_APPROVAL", "ACCEPTED", "CHECKED_IN"] },
      scheduledAt: { lt: scheduledEndAt },
      scheduledEndAt: { gt: scheduledAt },
    },
  });
  return Boolean(conflict);
}

// Ziyaret talebini oluşturan asıl mantık: doğrulama + çakışma kontrolü +
// visitor/visit kaydı + host'a email bildirimi. Hem web form action'ı hem
// mobil API route'u (src/app/api/mobile/visits) bunu çağırır.
export async function createVisitRequestCore(input: CreateVisitRequestInput): Promise<CreateVisitRequestResult> {
  const { name, phone, email, company, hostEmployeeId, visitReason } = input;
  const scheduledAtRaw = input.scheduledAt;
  const scheduledEndAtRaw = input.scheduledEndAt;

  if (!name || !phone || !email || !hostEmployeeId || !visitReason || !scheduledAtRaw || !scheduledEndAtRaw) {
    return { error: "Please fill in all required fields." };
  }

  const scheduledAt = new Date(scheduledAtRaw);
  const scheduledEndAt = new Date(scheduledEndAtRaw);
  if (Number.isNaN(scheduledAt.getTime()) || Number.isNaN(scheduledEndAt.getTime())) {
    return { error: "Please provide a valid date and time." };
  }
  if (scheduledAt.getTime() < Date.now()) {
    return { error: "Please pick a date and time in the future." };
  }
  if (scheduledEndAt.getTime() <= scheduledAt.getTime()) {
    return { error: "End time must be after the start time." };
  }
  // Randevular sadece mesai saatleri içinde, aynı gün içinde alınabilir.
  const hour = scheduledAt.getHours();
  if (hour < 9 || hour >= 18) {
    return { error: "Please pick a start time between 9:00 and 18:00." };
  }
  const endHour = scheduledEndAt.getHours();
  const endMinute = scheduledEndAt.getMinutes();
  const sameDay =
    scheduledEndAt.getFullYear() === scheduledAt.getFullYear() &&
    scheduledEndAt.getMonth() === scheduledAt.getMonth() &&
    scheduledEndAt.getDate() === scheduledAt.getDate();
  if (!sameDay || endHour < 9 || endHour > 18 || (endHour === 18 && endMinute > 0)) {
    return { error: "Please pick an end time between 9:00 and 18:00 on the same day." };
  }

  const host = await prisma.staff.findUnique({ where: { id: hostEmployeeId } });
  if (!host) {
    return { error: "Please select who you're visiting." };
  }

  const outcome = await runSerializable(async (tx) => {
    if (await hostHasRangeConflict(tx, hostEmployeeId, scheduledAt, scheduledEndAt)) {
      return { conflict: true } as const;
    }

    const visitor = await tx.visitor.create({
      data: { name, phone, email, company },
    });

    const visit = await tx.visit.create({
      data: {
        visitorId: visitor.id,
        hostEmployeeId,
        visitReason,
        scheduledAt,
        scheduledEndAt,
        accessToken: randomUUID(),
        tokenExpiresAt: new Date(scheduledEndAt.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    return { visit } as const;
  });

  if ("conflict" in outcome) {
    return { error: `${host.name} already has another visit scheduled in that time range. Please pick a different time.` };
  }

  try {
    await sendHostRequestNotification(host.email, name, visitReason, scheduledAt);
  } catch (error) {
    console.error(`Failed to send host notification for visit ${outcome.visit.id}:`, error);
  }

  return { success: true, visit: outcome.visit };
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
    scheduledEndAt: formData.get("scheduledEndAt") as string,
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

// Sadece resepsiyon giriş/çıkış onayı verebilir — admin dahil kimse bu adımı
// onun yerine yapamaz (fiziksel kontrol resepsiyonun işi).
async function requireReceptionist() {
  const session = await auth();
  if (session?.user?.role !== "RECEPTIONIST") {
    throw new Error("Only reception can check visitors in or out.");
  }
}

// İkinci onay aşaması: host çalışanın departmanına atanmış ADMIN, ya da
// departmanı olmayan (genel) bir ADMIN bu onayı verebilir.
async function requireDepartmentAdminOrSuperAdmin(hostEmployeeId: string) {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;
  if (!session || role !== "ADMIN" || !userId) {
    throw new Error("Not authorized to give final approval for this visit request.");
  }

  const admin = await prisma.staff.findUnique({ where: { id: userId } });
  if (!admin) {
    throw new Error("Not authorized to give final approval for this visit request.");
  }
  if (admin.department === null) {
    return; // genel admin, departmanı olmadığı için her isteği onaylayabilir
  }

  const host = await prisma.staff.findUnique({ where: { id: hostEmployeeId } });
  if (!host || host.department !== admin.department) {
    throw new Error("Not authorized to give final approval for this department's visit requests.");
  }
}

// Host'un departmanına bakan admin(ler); departmanın kendi admin'i yoksa
// (ya da host'un departmanı yoksa) departmanı olmayan genel admin(ler)e düşer.
async function getAdminsToNotify(hostEmployeeId: string) {
  const host = await prisma.staff.findUnique({ where: { id: hostEmployeeId } });
  if (!host) return [];

  if (host.department) {
    const deptAdmins = await prisma.staff.findMany({ where: { role: "ADMIN", department: host.department } });
    if (deptAdmins.length > 0) return deptAdmins;
  }

  return prisma.staff.findMany({ where: { role: "ADMIN", department: null } });
}

async function notifyVisitorOfDecision(visitId: string, decision: "ACCEPTED" | "REJECTED", reason?: string) {
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
      visit.accessToken,
      reason
    );
  } catch (error) {
    console.error(`Failed to send visitor decision notification for visit ${visitId}:`, error);
  }
}

// Personel onayladıktan sonra, o departmanın admin'ine (ya da genel admin'e)
// "senin onayın bekleniyor" maili gider.
async function notifyAdminsOfPendingApproval(visitId: string) {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { visitor: true, hostEmployee: true },
  });
  if (!visit) return;

  const admins = await getAdminsToNotify(visit.hostEmployeeId);
  for (const admin of admins) {
    try {
      await sendAdminPendingApprovalNotification(
        admin.email,
        visit.visitor.name,
        visit.hostEmployee.name,
        visit.scheduledAt,
        visit.visitReason
      );
    } catch (error) {
      console.error(`Failed to send admin pending-approval notification for visit ${visitId}:`, error);
    }
  }
}

// Admin son kararını verince host çalışana "onaylandı/reddedildi" maili gider.
async function notifyHostOfFinalDecision(visitId: string, decision: "ACCEPTED" | "REJECTED", reason?: string) {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { visitor: true, hostEmployee: true },
  });
  if (!visit) return;

  try {
    await sendHostFinalDecisionNotification(visit.hostEmployee.email, visit.hostEmployee.name, visit.visitor.name, decision, reason);
  } catch (error) {
    console.error(`Failed to send host final-decision notification for visit ${visitId}:`, error);
  }
}

// --- Core mutasyonlar: sadece DB güncellemesi + email bildirimi.
// Yetki kontrolü (requireHostOrAdmin / requireReceptionist / requireDepartmentAdminOrSuperAdmin)
// ve revalidatePath çağıranın (Server Action ya da mobil API route) işi.

// Personel onayı: talebi reddetmiyor ama son karar değil — departman admin'inin
// de onaylaması gerekiyor. Ziyaretçiye mail bu noktada gitmiyor (bkz. approveVisitByAdminCore),
// bunun yerine ilgili admin'e "onayın bekleniyor" maili gidiyor.
export async function approveVisitCore(visitId: string) {
  await prisma.visit.update({
    where: { id: visitId, status: "PENDING" },
    data: { status: "PENDING_ADMIN_APPROVAL", respondedAt: new Date() },
  });
  await notifyAdminsOfPendingApproval(visitId);
}

export async function rejectVisitCore(visitId: string) {
  await prisma.visit.update({
    where: { id: visitId, status: "PENDING" },
    data: { status: "REJECTED", respondedAt: new Date() },
  });
  await notifyVisitorOfDecision(visitId, "REJECTED");
}

// İkinci ve son onay: departman admin'i onaylayınca ziyaretçiye "onaylandı"
// maili, host çalışana da "onaylandı" bilgi maili gider.
export async function approveVisitByAdminCore(visitId: string) {
  await prisma.visit.update({
    where: { id: visitId, status: "PENDING_ADMIN_APPROVAL" },
    data: { status: "ACCEPTED" },
  });
  await notifyVisitorOfDecision(visitId, "ACCEPTED");
  await notifyHostOfFinalDecision(visitId, "ACCEPTED");
}

// Admin son aşamada reddederse bir gerekçe yazmak zorunda — bu gerekçe hem
// kayıtta tutulur hem host çalışana mail ile gider.
export async function rejectVisitByAdminCore(visitId: string, reason: string) {
  await prisma.visit.update({
    where: { id: visitId, status: "PENDING_ADMIN_APPROVAL" },
    data: { status: "REJECTED", adminRejectionReason: reason },
  });
  await notifyVisitorOfDecision(visitId, "REJECTED", reason);
  await notifyHostOfFinalDecision(visitId, "REJECTED", reason);
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

export async function approveVisitByAdmin(visitId: string) {
  const visit = await prisma.visit.findUniqueOrThrow({ where: { id: visitId } });
  await requireDepartmentAdminOrSuperAdmin(visit.hostEmployeeId);

  try {
    await approveVisitByAdminCore(visitId);
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
}

export async function rejectVisitByAdmin(visitId: string, formData: FormData) {
  const visit = await prisma.visit.findUniqueOrThrow({ where: { id: visitId } });
  await requireDepartmentAdminOrSuperAdmin(visit.hostEmployeeId);

  const reason = (formData.get("reason") as string)?.trim();
  if (!reason) {
    throw new Error("Please explain why you're rejecting this request.");
  }

  try {
    await rejectVisitByAdminCore(visitId, reason);
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
