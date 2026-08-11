"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { type Visit } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import {
  sendHostRequestNotification,
  sendHostFinalDecisionNotification,
  sendVisitorArrivedNotification,
  sendVisitorDepartedNotification,
} from "@/lib/email/notifyHost";
import { sendAdminPendingApprovalNotification } from "@/lib/email/notifyAdmin";
import { sendVisitorDecisionNotification, sendVisitorScheduleConflictNotification } from "@/lib/email/notifyVisitor";

export type VisitRequestState = {
  error?: string;
  success?: boolean;
  // Talep oluşturuldu ama host'un o saatte başka kabul edilmiş bir ziyareti
  // olduğu için otomatik reddedildi — form buna göre farklı bir mesaj gösterir.
  scheduleConflict?: boolean;
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
  | { success: true; error?: undefined; visit: Visit; scheduleConflict?: boolean };

// Randevular için sabit bir süre varsayıyoruz (Visit'in bir bitiş saati yok) —
// aynı host için bu süre içinde çakışan başka bir kabul edilmiş ziyaret var mı bakar.
const VISIT_DURATION_MS = 60 * 60 * 1000;

async function hostHasScheduleConflict(hostEmployeeId: string, scheduledAt: Date) {
  const windowStart = new Date(scheduledAt.getTime() - VISIT_DURATION_MS + 1);
  const windowEnd = new Date(scheduledAt.getTime() + VISIT_DURATION_MS - 1);
  const conflict = await prisma.visit.findFirst({
    where: {
      hostEmployeeId,
      status: { in: ["ACCEPTED", "CHECKED_IN"] },
      scheduledAt: { gt: windowStart, lt: windowEnd },
    },
  });
  return Boolean(conflict);
}

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

  // Host'un o saatte zaten kabul edilmiş (ACCEPTED/CHECKED_IN) başka bir
  // ziyareti varsa talep otomatik reddedilir — host'a hiç gitmez, ziyaretçiye
  // farklı bir saat denemesini söyleyen bir mail gider.
  const hasScheduleConflict = await hostHasScheduleConflict(hostEmployeeId, scheduledAt);

  const visit = await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      hostEmployeeId,
      visitReason,
      scheduledAt,
      accessToken: randomUUID(),
      tokenExpiresAt: new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000),
      ...(hasScheduleConflict
        ? {
            status: "REJECTED",
            respondedAt: new Date(),
            adminRejectionReason: `${host.name} already has another visit scheduled around this time.`,
          }
        : {}),
    },
  });

  if (hasScheduleConflict) {
    try {
      await sendVisitorScheduleConflictNotification(visitor.email ?? email, visitor.name, host.name, scheduledAt);
    } catch (error) {
      console.error(`Failed to send schedule-conflict notification for visit ${visit.id}:`, error);
    }
    return { success: true, visit, scheduleConflict: true };
  }

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
    return { success: true, scheduleConflict: result.scheduleConflict };
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
