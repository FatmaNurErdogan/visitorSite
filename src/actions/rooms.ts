"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError, runSerializable } from "@/lib/prismaErrors";
import { approveVisitCore } from "@/actions/visits";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Not authorized to manage meeting rooms.");
  }
  return session;
}

// Not: tx her zaman bir Prisma.TransactionClient olmalı (bkz. çağıranlar) —
// SERIALIZABLE izolasyon seviyesi altında bu SELECT'in aldığı range lock,
// aynı oda/aralık için eşzamanlı bir başka booking'in bu transaction bitene
// kadar beklemesini sağlıyor; commit'ten sonra tekrar okunduğunda çakışma
// artık görünür oluyor. Düz prisma client ile (transaction dışı) çağrılırsa
// bu garanti kalkar — iki eşzamanlı istek ikisi de conflict=false görüp aynı
// odayı çift rezerve edebilir.
async function roomHasConflict(
  tx: Prisma.TransactionClient,
  roomId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
) {
  const conflict = await tx.roomBooking.findFirst({
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

// Not: oda rezervasyonu ziyaret onayından tamamen bağımsız — bir ziyareti
// onaylamak oda seçmeyi gerektirmiyor (bkz. src/actions/visits.ts). Herhangi
// bir personel /staff/rooms üzerinden bağımsız bir toplantı odası rezervasyonu
// talep edebilir; oda o saatte doluysa (başka bir APPROVED rezervasyon varsa)
// talep oluşturulamaz, kişi farklı bir saat seçmek zorunda kalır. Oda boşsa
// talep PENDING olarak oluşur ve admin onayını bekler.

export type CreateRoomBookingInput = {
  roomId: string;
  purpose: string;
  startTime: string;
  endTime: string;
  requestedById: string;
};

export async function createRoomBookingCore(input: CreateRoomBookingInput): Promise<RoomFormState> {
  const room = await prisma.meetingRoom.findUnique({ where: { id: input.roomId } });
  if (!room) {
    return { error: "Room not found." };
  }

  const purpose = input.purpose?.trim();
  if (!purpose) {
    return { error: "Please describe the purpose of the meeting." };
  }

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return { error: "Please provide a valid date and time." };
  }
  if (startTime.getTime() < Date.now()) {
    return { error: "Please pick a time in the future." };
  }
  if (endTime.getTime() <= startTime.getTime()) {
    return { error: "End time must be after the start time." };
  }

  const hadConflict = await runSerializable(async (tx) => {
    if (await roomHasConflict(tx, input.roomId, startTime, endTime)) {
      return true;
    }
    await tx.roomBooking.create({
      data: {
        roomId: input.roomId,
        requestedById: input.requestedById,
        purpose,
        startTime,
        endTime,
      },
    });
    return false;
  });

  if (hadConflict) {
    return { error: "This room is already booked for that time — please pick a different time." };
  }

  return { success: true };
}

export async function createRoomBooking(
  roomId: string,
  _prevState: RoomFormState | undefined,
  formData: FormData
): Promise<RoomFormState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Not authorized to request a room booking.");
  }

  const result = await createRoomBookingCore({
    roomId,
    purpose: formData.get("purpose") as string,
    startTime: formData.get("startTime") as string,
    endTime: formData.get("endTime") as string,
    requestedById: userId,
  });

  if (result.success) {
    revalidatePath("/staff/rooms");
    revalidatePath("/staff/dashboard");
  }

  return result;
}

export type BookRoomInput = {
  roomId: string;
  purpose: string;
  startTime: string;
  endTime: string;
};

// ADMIN'in bir odayı, herhangi bir ziyaretten bağımsız olarak, gelecekteki
// istediği bir tarih/saat aralığı için doğrudan rezerve etmesi (ör. iç
// toplantı) — visitId boş bir RoomBooking, direkt APPROVED. Hem web form
// action'ı hem mobil API route'u (src/app/api/mobile/rooms/[id]/bookings)
// bunu çağırır; yetki kontrolü (sadece ADMIN) çağıranın işi.
export async function createDirectRoomBookingCore(adminId: string, input: BookRoomInput): Promise<RoomFormState> {
  const purpose = input.purpose?.trim();
  if (!purpose) {
    return { error: "Please describe the purpose of this booking." };
  }

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return { error: "Please provide valid start and end times." };
  }
  if (startTime.getTime() < Date.now()) {
    return { error: "Please pick a start time in the future." };
  }
  if (endTime.getTime() <= startTime.getTime()) {
    return { error: "End time must be after the start time." };
  }

  const room = await prisma.meetingRoom.findUnique({ where: { id: input.roomId } });
  if (!room) {
    return { error: "Please select a meeting room." };
  }

  const hadConflict = await runSerializable(async (tx) => {
    if (await roomHasConflict(tx, room.id, startTime, endTime)) {
      return true;
    }
    await tx.roomBooking.create({
      data: {
        roomId: room.id,
        requestedById: adminId,
        approvedById: adminId,
        purpose,
        startTime,
        endTime,
        status: "APPROVED",
        respondedAt: new Date(),
      },
    });
    return false;
  });

  if (hadConflict) {
    return { error: "This room is already booked for that time." };
  }

  return { success: true };
}

// ADMIN'in daha önce oluşturduğu bir doğrudan (ziyaretsiz) rezervasyonu,
// süresi dolmadan iptal edip odayı erken serbest bırakması. Ziyarete bağlı
// booking'ler kapsam dışı — onu iptal etmek ziyaretin durumunu da etkiler,
// bu farklı bir akış (bkz. rejectRoomBooking/approveVisitCore). Hard-delete
// yerine status'u CANCELLED yapıyoruz ki kim ne zaman rezerve etmiş/iptal
// etmiş bilgisi kalsın — uygulamanın geri kalanı da hep böyle (soft status).
export async function cancelDirectRoomBookingCore(bookingId: string): Promise<RoomFormState> {
  const booking = await prisma.roomBooking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { error: "Booking not found." };
  }
  if (booking.visitId) {
    return { error: "This booking is tied to a visit and can't be cancelled here." };
  }
  if (booking.status !== "APPROVED") {
    return { error: "Only an active booking can be cancelled." };
  }

  await prisma.roomBooking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", respondedAt: new Date() },
  });

  return { success: true };
}

export async function cancelDirectRoomBooking(bookingId: string) {
  await requireAdmin();

  const result = await cancelDirectRoomBookingCore(bookingId);
  if (result.error) {
    throw new Error(result.error);
  }

  revalidatePath("/staff/rooms");
}

export async function bookRoom(
  roomId: string,
  _prevState: RoomFormState | undefined,
  formData: FormData
): Promise<RoomFormState> {
  const session = await requireAdmin();

  const result = await createDirectRoomBookingCore(session.user!.id!, {
    roomId,
    purpose: formData.get("purpose") as string,
    startTime: formData.get("startTime") as string,
    endTime: formData.get("endTime") as string,
  });

  if (result.success) {
    revalidatePath("/staff/rooms");
  }

  return result;
}

// Sadece ADMIN bekleyen oda taleplerini onaylayıp reddedebilir.
export async function approveRoomBooking(bookingId: string) {
  const session = await requireAdmin();

  const outcome = await runSerializable(async (tx) => {
    const booking = await tx.roomBooking.findUniqueOrThrow({ where: { id: bookingId } });
    if (booking.status !== "PENDING") return { skipped: true } as const; // başka biri zaten işlemiş

    if (await roomHasConflict(tx, booking.roomId, booking.startTime, booking.endTime, booking.id)) {
      return { conflict: true } as const;
    }

    await tx.roomBooking.update({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "APPROVED", respondedAt: new Date(), approvedById: session.user!.id },
    });

    return { visitId: booking.visitId } as const;
  });

  if ("skipped" in outcome) return;
  if ("conflict" in outcome) {
    throw new Error("This room is already booked for that time — reject this ticket instead.");
  }

  try {
    // Geriye dönük uyumluluk: eski (artık yeni kodun set etmediği) ziyarete
    // bağlı bir booking onaylanıyorsa, ziyareti de kabul edilmiş say.
    if (outcome.visitId) {
      await approveVisitCore(outcome.visitId);
    }
  } catch (error) {
    if (!isRecordNotFoundError(error)) throw error;
  }

  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/visits");
  revalidatePath("/staff/rooms");
}

export type RoomCalendarBooking = {
  id: string;
  roomId: string;
  roomName: string;
  startTime: Date;
  endTime: Date;
  purpose: string;
  // "Ziyaretçi adı (host ziyaretinde)" ya da "Talep eden adı (iç toplantı)".
  label: string;
};

// /staff/rooms'taki aylık takvim ve mobil karşılığı (/api/mobile/rooms/calendar)
// için — tüm odaların [monthStart, monthEnd) aralığına düşen (kesişen)
// onaylanmış rezervasyonları. roomHasConflict'in aksine burada geçmiş
// rezervasyonlar da dahil — takvimde geçmiş aylara bakılabilmesi gerekiyor.
export async function getRoomBookingsForMonth(monthStart: Date, monthEnd: Date): Promise<RoomCalendarBooking[]> {
  const bookings = await prisma.roomBooking.findMany({
    where: {
      status: "APPROVED",
      startTime: { lt: monthEnd },
      endTime: { gt: monthStart },
    },
    include: {
      room: { select: { name: true } },
      requestedBy: { select: { name: true } },
      visit: { include: { visitor: true, hostEmployee: { select: { name: true } } } },
    },
    orderBy: { startTime: "asc" },
  });

  return bookings.map((booking) => ({
    id: booking.id,
    roomId: booking.roomId,
    roomName: booking.room.name,
    startTime: booking.startTime,
    endTime: booking.endTime,
    purpose: booking.purpose,
    label: booking.visit
      ? `${booking.visit.visitor.name} (${booking.visit.hostEmployee.name} ziyaretinde)`
      : `${booking.requestedBy.name} (iç toplantı)`,
  }));
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
