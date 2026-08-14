import Link from "next/link";
import { UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isChatOpen } from "@/actions/messages";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusFilter } from "@/components/StatusFilter";

export const dynamic = "force-dynamic";

const STATUSES = [
  "PENDING",
  "PENDING_ADMIN_APPROVAL",
  "ACCEPTED",
  "REJECTED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "EXPIRED",
];

export default async function StaffVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  const visits = await prisma.visit.findMany({
    where: status ? { status } : undefined,
    include: { visitor: true, hostEmployee: true },
    orderBy: { scheduledAt: "desc" },
  });

  // Just hides the link for rows this viewer can't open — the real
  // enforcement is server-side in /staff/visits/[id]/chat and its API route.
  const canChat = (hostEmployeeId: string) => role === "ADMIN" || userId === hostEmployeeId;

  return (
    <main className="staff-visits-page page-container-wide">
      <div className="page-header-row">
        <div>
          <h1>Ziyaretler</h1>
          <p>Tüm ziyaretlerin salt okunur kaydı. Talepleri onaylamak/reddetmek ve giriş/çıkışları onaylamak için panele gidin.</p>
        </div>
        <Link href="/staff/visits/new" className="btn btn-secondary">
          <UserPlus size={15} strokeWidth={2} /> Kapıdan gelen ziyaretçi ekle
        </Link>
      </div>

      <div className="filter-bar">
        <span className="form-label">Duruma göre filtrele</span>
        <StatusFilter statuses={STATUSES} value={status ?? ""} />
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Ziyaretçi</th>
            <th>Şirket</th>
            <th>Host</th>
            <th>Sebep</th>
            <th>Beklenen saat</th>
            <th>Gerçek giriş/çıkış saati</th>
            <th>Durum</th>
            <th>Reddetme sebebi</th>
            <th>Sohbet</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => (
            <tr key={visit.id}>
              <td data-label="Ziyaretçi">{visit.visitor.name}</td>
              <td data-label="Şirket">{visit.visitor.company || "-"}</td>
              <td data-label="Host">{visit.hostEmployee.name}</td>
              <td data-label="Sebep">{visit.visitReason}</td>
              <td data-label="Beklenen saat">{visit.scheduledAt.toLocaleString()} – {visit.scheduledEndAt.toLocaleTimeString()}</td>
              <td data-label="Gerçek giriş/çıkış saati">
                {visit.checkedInAt ? (
                  <>
                    {visit.checkedInAt.toLocaleTimeString()}
                    {visit.checkedOutAt && ` – ${visit.checkedOutAt.toLocaleTimeString()}`}
                  </>
                ) : (
                  "-"
                )}
              </td>
              <td data-label="Durum">
                <StatusBadge status={visit.status} />
              </td>
              <td data-label="Reddetme sebebi">{visit.adminRejectionReason || "-"}</td>
              <td data-label="Sohbet">
                {isChatOpen(visit.status) && canChat(visit.hostEmployeeId) ? (
                  <Link href={`/staff/visits/${visit.id}/chat`}>Sohbeti aç</Link>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
