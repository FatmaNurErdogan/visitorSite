import Link from "next/link";
import { auth } from "@/auth";
import { MeetingRoomForm } from "@/components/MeetingRoomForm";

export default async function NewMeetingRoomPage() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return (
      <main className="page-container">
        <h1>Not authorized</h1>
        <p>Only admins can manage meeting rooms.</p>
        <Link href="/staff/rooms">Back to rooms</Link>
      </main>
    );
  }

  return (
    <main className="page-container">
      <h1>Add a meeting room</h1>
      <p>
        <Link href="/staff/rooms">Back to rooms</Link>
      </p>
      <MeetingRoomForm />
    </main>
  );
}
