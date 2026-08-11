// /staff/rooms/[roomId]/book — herhangi bir personelin bağımsız bir toplantı
// odası rezervasyonu talep ettiği sayfa. Çakışmayı önceden görebilmesi için
// odanın onaylanmış/bekleyen yaklaşan rezervasyonları da burada listeleniyor.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RoomBookingForm } from "@/components/RoomBookingForm";

export const dynamic = "force-dynamic";

export default async function BookRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  const room = await prisma.meetingRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return (
      <main className="page-container">
        <h1>Room not found</h1>
        <Link href="/staff/rooms">Back to rooms</Link>
      </main>
    );
  }

  const upcomingBookings = await prisma.roomBooking.findMany({
    where: {
      roomId,
      status: { in: ["APPROVED", "PENDING"] },
      endTime: { gte: new Date() },
    },
    orderBy: { startTime: "asc" },
  });

  return (
    <main className="page-container">
      <h1>Book {room.name}</h1>
      <p>
        <Link href="/staff/rooms">Back to rooms</Link>
      </p>

      {upcomingBookings.length > 0 && (
        <div className="card">
          <p>
            <strong>Already taken (or pending approval):</strong>
          </p>
          {upcomingBookings.map((booking) => (
            <p key={booking.id}>
              {booking.startTime.toLocaleString()} – {booking.endTime.toLocaleTimeString()}
              {booking.status === "PENDING" ? " (pending)" : ""}
            </p>
          ))}
        </div>
      )}

      <RoomBookingForm roomId={room.id} />
    </main>
  );
}
