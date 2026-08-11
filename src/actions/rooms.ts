"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import { approveVisitCore } from "@/actions/visits";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Not authorized to manage meeting rooms.");
  }
  return session;
}

async function roomHasConflict(roomId: string, startTime: Date, endTime: Date, excludeBookingId?: string) {
  const conflict = await prisma.roomBooking.findFirst({
    where: {
      roomId,
      status: "APPROVED",
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      // İki aralık çakışıyorsa: biri diğeri bitmeden başlıyorsa.
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
  return Boolean(conflict);
}

export type RoomFormState = { error?: string; success?: boolean };

export type CreateMeetingRoomInput = {
  name: string;
  location?: string;
  capacity?: number;
  // Virgülle ayrılmış serbest metin, ör. "Projector, Whiteboard, TV".
  perks?: string;
};

// "Projector,  Whiteboard ,TV,, " gibi bir girdiyi ["Projector","Whiteboard","TV"]
// yapıp tekrar "Projector, Whiteboard, TV" olarak birleştirir. Boşsa null.
function normalizePerks(raw: string | undefined): string | null {
  if (!raw) return null;
  const perks = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return perks.length > 0 ? perks.join(", ") : null;
}

// Doğrulama + oda oluşturma mantığı. Hem web form action'ı hem mobil API
// route'u (src/app/api/mobile/rooms) bunu çağırır; yetki kontrolü (sadece
// ADMIN) çağıranın işi.
export async function createMeetingRoomCore(input: CreateMeetingRoomInput): Promise<RoomFormState> {
  const name = input.name?.trim();
  const location = input.location?.trim() || undefined;
  const capacity = input.capacity;
  const perks = normalizePerks(input.perks);

  if (!name) {
    return { error: "Please give the room a name." };
  }
  if (capacity !== undefined && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { error: "Capacity must be a positive whole number." };
  }

  const existing = await prisma.meetingRoom.findUnique({ where: { name } });
  if (existing) {
    return { error: "A room with this name already exists." };
  }

  await prisma.meetingRoom.create({ data: { name, location, capacity, perks } });
  return { success: true };
}

// Sadece ADMIN yeni oda ekleyebilir.
export async function createMeetingRoom(
  _prevState: RoomFormState | undefined,
  formData: FormData
): Promise<RoomFormState> {
  await requireAdmin();

  const capacityRaw = (formData.get("capacity") as string)?.trim();

  const result = await createMeetingRoomCore({
    name: formData.get("name") as string,
    location: formData.get("location") as string,
    capacity: capacityRaw ? Number(capacityRaw) : undefined,
    perks: formData.get("perks") as string,
  });

  if (result.success) {
    revalidatePath("/staff/rooms");
  }

  return result;
}

// Bir ziyareti onaylamak artık bir oda seçmeyi gerektiriyor. Host EMPLOYEE
// ise bu bir RoomBooking talebi (PENDING) oluşturur — ziyaret ancak admin bu
// talebi onaylayınca ACCEPTED olur. Host ADMIN ise (ya da ADMIN başka
// birinin ziyaretini onaylıyorsa) bu bekleme adımı atlanır: booking direkt
// APPROVED olarak oluşturulur ve ziyaret hemen kabul edilir.
//
// Hem web form action'ı hem mobil API route'u (src/app/api/mobile/visits/[id]/approve)
// bunu çağırır — yetki kontrolü (role/userId) çağıranın işi, roomId/endTime
// zaten doğrulanmış olarak buraya geliyor.
export async function submitVisitApprovalCore(
  visitId: string,
  role: string | undefined,
  userId: string,
  roomId: string,
  endTimeRaw: string
): Promise<RoomFormState> {
  const visit = await prisma.visit.findUniqueOrThrow({ where: { id: visitId } });
  if (visit.status !== "PENDING") {
    return { error: "This visit request has already been processed." };
  }

  const endTime = new Date(endTimeRaw);
  if (!endTimeRaw || Number.isNaN(endTime.getTime()) || endTime.getTime() <= visit.scheduledAt.getTime()) {
    return { error: "Please pick an end time after the visit's scheduled start." };
  }

  const room = await prisma.meetingRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return { error: "Please select a meeting room." };
  }

  if (role === "ADMIN") {
    if (await roomHasConflict(room.id, visit.scheduledAt, endTime)) {
      return { error: "This room is already booked for that time." };
    }

    await prisma.roomBooking.create({
      data: {
        roomId: room.id,
        visitId: visit.id,
        requestedById: userId,
        approvedById: userId,
        purpose: `Visit: ${visit.visitReason}`,
        startTime: visit.scheduledAt,
        endTime,
        status: "APPROVED",
        respondedAt: new Date(),
      },
    });

    try {
      await approveVisitCore(visitId);
    } catch (error) {
      if (!isRecordNotFoundError(error)) throw error;
    }
  } else {
    const existingTicket = await prisma.roomBooking.findFirst({
      where: { visitId: visit.id, status: "PENDING" },
    });
    if (existingTicket) {
      return { error: "A room request for this visit is already pending." };
    }

    await prisma.roomBooking.create({
      data: {
        roomId: room.id,
        visitId: visit.id,
        requestedById: userId,
        purpose: `Visit: ${visit.visitReason}`,
        startTime: visit.scheduledAt,
        endTime,
      },
    });
  }

  return { success: true };
}

export async function submitVisitApproval(
  visitId: string,
  _prevState: RoomFormState | undefined,
  formData: FormData
): Promise<RoomFormState> {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;
  if (!session?.user || !userId) {
    throw new Error("Not authorized to respond to this visit request.");
  }

  const visit = await prisma.visit.findUniqueOrThrow({ where: { id: visitId } });
  if (role !== "ADMIN" && userId !== visit.hostEmployeeId) {
    throw new Error("Not authorized to respond to this visit request.");
  }

  const result = await submitVisitApprovalCore(
    visitId,
    role,
    userId,
    formData.get("roomId") as string,
    formData.get("endTime") as string
  );

  if (result.success) {
    revalidatePath("/staff/dashboard");
    revalidatePath("/staff/visits");
    revalidatePath("/staff/rooms");
  }

  return result;
}

// Sadece ADMIN bekleyen oda taleplerini onaylayıp reddedebilir.
export async function approveRoomBooking(bookingId: string) {
  const session = await requireAdmin();

  const booking = await prisma.roomBooking.findUniqueOrThrow({ where: { id: bookingId } });
  if (booking.status !== "PENDING") return; // başka biri zaten işlemiş

  if (await roomHasConflict(booking.roomId, booking.startTime, booking.endTime, booking.id)) {
    throw new Error("This room is already booked for that time — reject this ticket instead.");
  }

  try {
    await prisma.roomBooking.update({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "APPROVED", respondedAt: new Date(), approvedById: session.user!.id },
    });

    if (booking.visitId) {
      await approveVisitCore(booking.visitId);
    }
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
  revalidatePath("/staff/rooms");
}

export async function rejectRoomBooking(bookingId: string) {
  const session = await requireAdmin();

  try {
    await prisma.roomBooking.update({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "REJECTED", respondedAt: new Date(), approvedById: session.user!.id },
    });
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
  revalidatePath("/staff/rooms");
}
