import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  approveVisit,
  rejectVisit,
  approveVisitByAdmin,
  rejectVisitByAdmin,
  checkInVisit,
  checkOutVisit,
} from "@/actions/visits";
import { approveRoomBooking, rejectRoomBooking } from "@/actions/rooms";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { EmptyState } from "@/components/EmptyState";
import { CheckCircle2, XCircle, DoorOpen, CalendarCheck, LogIn, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  const showApprovals = role === "EMPLOYEE" || role === "ADMIN";
  const showAdminApprovals = role === "ADMIN";
  const showTodaysVisits = role === "RECEPTIONIST";
  const showRoomRequests = role === "ADMIN";

  const pendingApprovals = showApprovals
    ? await prisma.visit.findMany({
        where: {
          status: "PENDING",
          ...(role === "ADMIN" ? {} : { hostEmployeeId: userId }),
        },
        include: { visitor: true, hostEmployee: true },
        orderBy: { requestedAt: "asc" },
      })
    : [];

  // Departman admin'i olarak son onayını bekleyen talepler: eğer admin'in
  // kendi departmanı varsa sadece o departmandaki host'ların talepleri,
  // departmanı olmayan (genel) admin ise hepsini görür.
  const currentAdmin = showAdminApprovals ? await prisma.staff.findUnique({ where: { id: userId } }) : null;
  const pendingAdminApprovals = showAdminApprovals
    ? await prisma.visit.findMany({
        where: {
          status: "PENDING_ADMIN_APPROVAL",
          ...(currentAdmin?.department ? { hostEmployee: { department: currentAdmin.department } } : {}),
        },
        include: { visitor: true, hostEmployee: true },
        orderBy: { requestedAt: "asc" },
      })
    : [];

  const pendingRoomRequests = showRoomRequests
    ? await prisma.roomBooking.findMany({
        where: { status: "PENDING" },
        include: {
          room: true,
          requestedBy: true,
          visit: { include: { visitor: true, hostEmployee: true } },
        },
        orderBy: { requestedAt: "asc" },
      })
    : [];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todaysVisits = showTodaysVisits
    ? await prisma.visit.findMany({
        where: {
          OR: [
            { status: { in: ["ACCEPTED", "CHECKED_IN"] } },
            { status: "PENDING", scheduledAt: { gte: startOfToday, lte: endOfToday } },
          ],
        },
        include: { visitor: true, hostEmployee: true },
        orderBy: { scheduledAt: "asc" },
      })
    : [];

  return (
    <main className="page-container">
      <h1>Panel</h1>

      {showApprovals && (
        <section>
          <h2>Onayınızı bekleyenler</h2>
          {pendingApprovals.length === 0 && (
            <EmptyState icon={CheckCircle2} title="Her şey tamam" message="Sizi bekleyen bir şey yok." />
          )}
          {pendingApprovals.map((visit) => (
            <div className="card" key={visit.id}>
              <p>
                <strong>{visit.visitor.name}</strong> ({visit.visitor.company || "şirket belirtilmedi"}){" "}
                {visit.hostEmployee.name} adlı çalışanı {visit.scheduledAt.toLocaleString()} tarihinde ziyaret etmek istiyor
              </p>
              <p>Sebep: {visit.visitReason}</p>
              <form action={approveVisit.bind(null, visit.id)} style={{ display: "inline" }}>
                <SubmitButton className="btn btn-success" pendingText="Onaylanıyor...">
                  <CheckCircle2 size={15} strokeWidth={2} /> Onayla
                </SubmitButton>
              </form>{" "}
              <form action={rejectVisit.bind(null, visit.id)} style={{ display: "inline" }}>
                <SubmitButton className="btn btn-danger" pendingText="Reddediliyor...">
                  <XCircle size={15} strokeWidth={2} /> Reddet
                </SubmitButton>
              </form>
            </div>
          ))}
        </section>
      )}

      {showAdminApprovals && (
        <section>
          <h2>Son onayınızı bekleyenler{currentAdmin?.department ? ` (${currentAdmin.department})` : ""}</h2>
          <p>Bunlar host çalışan tarafından zaten onaylandı ve ziyaretçiye bildirilmeden önce sizin onayınızı bekliyor.</p>
          {pendingAdminApprovals.length === 0 && (
            <EmptyState icon={CheckCircle2} title="Her şey tamam" message="Sizi bekleyen bir şey yok." />
          )}
          {pendingAdminApprovals.map((visit) => (
            <div className="card" key={visit.id}>
              <p>
                <strong>{visit.visitor.name}</strong> ({visit.visitor.company || "şirket belirtilmedi"}){" "}
                {visit.hostEmployee.name} adlı çalışanı {visit.scheduledAt.toLocaleString()} tarihinde ziyaret etmek istiyor
              </p>
              <p>Sebep: {visit.visitReason}</p>
              <form action={approveVisitByAdmin.bind(null, visit.id)} style={{ display: "inline" }}>
                <SubmitButton className="btn btn-success" pendingText="Onaylanıyor...">
                  <CheckCircle2 size={15} strokeWidth={2} /> Onayla
                </SubmitButton>
              </form>
              <form action={rejectVisitByAdmin.bind(null, visit.id)} className="admin-reject-form">
                <textarea
                  className="form-input"
                  name="reason"
                  placeholder="Neden reddediyorsunuz? (zorunlu)"
                  rows={2}
                  required
                />
                <SubmitButton className="btn btn-danger" pendingText="Reddediliyor...">
                  <XCircle size={15} strokeWidth={2} /> Reddet
                </SubmitButton>
              </form>
            </div>
          ))}
        </section>
      )}

      {showRoomRequests && (
        <section>
          <h2>Bekleyen oda talepleri</h2>
          {pendingRoomRequests.length === 0 && (
            <EmptyState icon={DoorOpen} title="Oda talebi yok" message="Sizi bekleyen bir şey yok." />
          )}
          {pendingRoomRequests.map((booking) => (
            <div className="card" key={booking.id}>
              <p>
                <strong>{booking.requestedBy.name}</strong>, <strong>{booking.room.name}</strong> odasını{" "}
                {booking.startTime.toLocaleString()} - {booking.endTime.toLocaleTimeString()} arası talep etti
              </p>
              {booking.visit && (
                <p>
                  İlgili ziyaret: {booking.visit.visitor.name}, {booking.visit.hostEmployee.name} adlı çalışanı ziyaret ediyor
                </p>
              )}
              <p>Amaç: {booking.purpose}</p>
              <form action={approveRoomBooking.bind(null, booking.id)} style={{ display: "inline" }}>
                <SubmitButton className="btn btn-success" pendingText="Onaylanıyor...">
                  <CheckCircle2 size={15} strokeWidth={2} /> Onayla
                </SubmitButton>
              </form>{" "}
              <form action={rejectRoomBooking.bind(null, booking.id)} style={{ display: "inline" }}>
                <SubmitButton className="btn btn-danger" pendingText="Reddediliyor...">
                  <XCircle size={15} strokeWidth={2} /> Reddet
                </SubmitButton>
              </form>
            </div>
          ))}
        </section>
      )}

      {showTodaysVisits && (
        <section>
          <h2>Bugünkü ziyaretler</h2>
          {todaysVisits.length === 0 && (
            <EmptyState icon={CalendarCheck} title="Planlanmış bir şey yok" message="Şu anda ele alınacak ziyaret yok." />
          )}
          {todaysVisits.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Ziyaretçi</th>
                  <th>Host</th>
                  <th>Tarih</th>
                  <th>Saat</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {todaysVisits.map((visit) => (
                  <tr key={visit.id}>
                    <td data-label="Ziyaretçi">{visit.visitor.name}</td>
                    <td data-label="Host">{visit.hostEmployee.name}</td>
                    <td data-label="Tarih">{visit.scheduledAt.toLocaleDateString()}</td>
                    <td data-label="Saat">{visit.scheduledAt.toLocaleTimeString()}</td>
                    <td data-label="Durum">
                      <StatusBadge status={visit.status} />
                    </td>
                    <td data-label="İşlem">
                      {visit.status === "ACCEPTED" && (
                        <form action={checkInVisit.bind(null, visit.id)}>
                          <SubmitButton className="btn btn-primary" pendingText="Onaylanıyor...">
                            <LogIn size={15} strokeWidth={2} /> Girişi onayla
                          </SubmitButton>
                        </form>
                      )}
                      {visit.status === "CHECKED_IN" && (
                        <form action={checkOutVisit.bind(null, visit.id)}>
                          <SubmitButton className="btn btn-primary" pendingText="Onaylanıyor...">
                            <LogOut size={15} strokeWidth={2} /> Çıkışı onayla
                          </SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}
