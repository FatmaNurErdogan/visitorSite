"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prismaErrors";

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

// Not: oda rezervasyonu artık ziyaret onayından tamamen bağımsız — bir ziyareti
// onaylamak oda seçmeyi gerektirmiyor (bkz. src/actions/visits.ts). Bu
// fonksiyonlar, ileride bağımsız bir "oda rezervasyonu yap" akışı eklenirse
// diye duruyor; şu an onları PENDING'e çeken bir oluşturma akışı yok.

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
