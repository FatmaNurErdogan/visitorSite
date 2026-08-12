import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookRoomForm } from "@/components/BookRoomForm";

export const dynamic = "force-dynamic";

export default async function BookRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return (
      <main className="page-container">
        <h1>Not authorized</h1>
        <p>Only admins can book a room directly.</p>
        <Link href="/staff/rooms">Back to rooms</Link>
      </main>
    );
  }

  const room = await prisma.meetingRoom.findUnique({ where: { id } });
  if (!room) {
    return (
      <main className="page-container">
        <h1>Room not found</h1>
        <Link href="/staff/rooms">Back to rooms</Link>
      </main>
    );
  }

  return (
    <main className="page-container">
      <h1>Book {room.name}</h1>
      <p>
        <Link href="/staff/rooms">Back to rooms</Link>
      </p>
      <BookRoomForm roomId={room.id} />
    </main>
  );
}
