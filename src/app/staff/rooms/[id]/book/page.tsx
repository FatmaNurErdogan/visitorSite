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
        <h1>Yetkiniz yok</h1>
        <p>Bir odayı doğrudan yalnızca yöneticiler rezerve edebilir.</p>
        <Link href="/staff/rooms">Odalara dön</Link>
      </main>
    );
  }

  const room = await prisma.meetingRoom.findUnique({ where: { id } });
  if (!room) {
    return (
      <main className="page-container">
        <h1>Oda bulunamadı</h1>
        <Link href="/staff/rooms">Odalara dön</Link>
      </main>
    );
  }

  return (
    <main className="page-container">
      <h1>{room.name} odasını rezerve et</h1>
      <p>
        <Link href="/staff/rooms">Odalara dön</Link>
      </p>
      <BookRoomForm roomId={room.id} />
    </main>
  );
}
