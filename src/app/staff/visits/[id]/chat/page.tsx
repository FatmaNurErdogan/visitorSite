import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isChatOpen } from "@/actions/messages";
import { ChatBox } from "@/components/ChatBox";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function StaffVisitChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: { visitor: true, hostEmployee: true },
  });

  if (!visit) {
    return (
      <main className="page-container">
        <h1>Ziyaret bulunamadı</h1>
        <Link href="/staff/visits">Ziyaretlere dön</Link>
      </main>
    );
  }

  // Same rule the API route (/api/staff/visits/[id]/messages) enforces —
  // duplicated here so a non-host/non-admin gets a clean page instead of a
  // ChatBox that just fails every fetch.
  if (role !== "ADMIN" && userId !== visit.hostEmployeeId) {
    return (
      <main className="page-container">
        <h1>Yetkiniz yok</h1>
        <p>Bu sohbeti yalnızca host veya bir yönetici açabilir.</p>
        <Link href="/staff/visits">Ziyaretlere dön</Link>
      </main>
    );
  }

  return (
    <main className="page-container">
      <h1>{visit.visitor.name} ile sohbet</h1>
      <p>
        <Link href="/staff/visits">Ziyaretlere dön</Link>
      </p>
      <p>
        {visit.hostEmployee.name} adlı çalışanı ziyaret ediyor &mdash; <StatusBadge status={visit.status} />
      </p>

      {isChatOpen(visit.status) ? (
        <ChatBox apiUrl={`/api/staff/visits/${id}/messages`} viewerType="STAFF" />
      ) : (
        <p>Bu ziyaret için sohbet kullanılamıyor.</p>
      )}
    </main>
  );
}
