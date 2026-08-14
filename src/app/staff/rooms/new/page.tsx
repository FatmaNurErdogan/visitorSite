import Link from "next/link";
import { auth } from "@/auth";
import { MeetingRoomForm } from "@/components/MeetingRoomForm";

export const dynamic = "force-dynamic";

export default async function NewMeetingRoomPage() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return (
      <main className="page-container">
        <h1>Yetkiniz yok</h1>
        <p>Toplantı odalarını yalnızca yöneticiler yönetebilir.</p>
        <Link href="/staff/rooms">Odalara dön</Link>
      </main>
    );
  }

  return (
    <main className="page-container">
      <h1>Toplantı odası ekle</h1>
      <p>
        <Link href="/staff/rooms">Odalara dön</Link>
      </p>
      <MeetingRoomForm />
    </main>
  );
}
