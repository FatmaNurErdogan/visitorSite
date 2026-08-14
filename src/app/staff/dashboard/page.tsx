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
import {
  CheckCircle2,
  XCircle,
  DoorOpen,
  CalendarCheck,
  LogIn,
  LogOut,
  ClipboardList,
  Clock,
  Home,
} from "lucide-react";

export const dynamic = "force-dynamic";

// "Elif Yıldız" -> "EY" — avatar rozetindeki baş harfler.
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function StaffDashboardPage() {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;
  const name = session?.user?.name ?? "";

  const showApprovals = role === "EMPLOYEE" || role === "ADMIN";
  const showAdminApprovals = role === "ADMIN";
  const showTodaysVisits = role === "RECEPTIONIST";
  const showRoomRequests = role === "ADMIN";
  const showRoomStatus = role !== "RECEPTIONIST";

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

  const now = new Date();
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

  // Panel üstündeki "Bugünkü ziyaretler" sayısı — herkes için, statüden
  // bağımsız, bugüne planlanmış tüm ziyaretler.
  const todaysVisitCount = await prisma.visit.count({
    where: { scheduledAt: { gte: startOfToday, lte: endOfToday } },
  });

  const rooms = showRoomStatus
    ? await prisma.meetingRoom.findMany({
        include: {
          bookings: {
            where: { status: "APPROVED", startTime: { lte: now }, endTime: { gt: now } },
            include: { visit: { include: { visitor: true, hostEmployee: true } } },
          },
        },
        orderBy: { name: "asc" },
      })
    : [];
  const availableRoomCount = rooms.filter((room) => room.bookings.length === 0).length;

  const pendingTotal = pendingApprovals.length + pendingAdminApprovals.length;

  return (
    <main className="page-container-wide">
      <div className="page-head">
        <div>
          <p className="page-eyebrow">Sayfalar / Panel</p>
          <h1 className="page-title">Merhaba, {name || "Personel"}</h1>
        </div>
      </div>

      {(showApprovals || showRoomStatus) && (
        <div className="kpi-row">
          <div className="card kpi-card">
            <div className="kpi-icon">
              <ClipboardList size={19} strokeWidth={2} />
            </div>
            <div>
              <p className="kpi-label">Bugünkü ziyaretler</p>
              <p className="kpi-value">{todaysVisitCount}</p>
            </div>
          </div>
          {showApprovals && (
            <div className="card kpi-card">
              <div className="kpi-icon">
                <Clock size={19} strokeWidth={2} />
              </div>
              <div>
                <p className="kpi-label">Onay bekleyen</p>
                <p className="kpi-value">{pendingTotal}</p>
              </div>
            </div>
          )}
          {showRoomStatus && (
            <div className="card kpi-card">
              <div className="kpi-icon">
                <Home size={19} strokeWidth={2} />
              </div>
              <div>
                <p className="kpi-label">Müsait oda</p>
                <p className="kpi-value">
                  {availableRoomCount} / {rooms.length}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={showRoomStatus ? "dashboard-grid" : undefined}>
        <div>
          {showApprovals && (
            <div className="card">
              <div className="card-head">
                <p className="card-title">Onayını bekleyenler</p>
              </div>
              {pendingApprovals.length === 0 && (
                <EmptyState icon={CheckCircle2} title="Her şey tamam" message="Sizi bekleyen bir şey yok." />
              )}
              {pendingApprovals.map((visit) => (
                <div className="approval-row" key={visit.id}>
                  <span className="avatar-chip">{initials(visit.visitor.name)}</span>
                  <div className="approval-row-text">
                    <p className="approval-row-name">
                      {visit.visitor.name}
                      {visit.visitor.company ? ` · ${visit.visitor.company}` : ""}
                    </p>
                    <p className="approval-row-meta">
                      {visit.hostEmployee.name} · {visit.scheduledAt.toLocaleString()} –{" "}
                      {visit.scheduledEndAt.toLocaleTimeString()}
                    </p>
                    <p className="approval-row-meta">Sebep: {visit.visitReason}</p>
                  </div>
                  <div className="approval-row-actions">
                    <form action={rejectVisit.bind(null, visit.id)}>
                      <SubmitButton className="btn btn-secondary btn-sm" pendingText="...">
                        Reddet
                      </SubmitButton>
                    </form>
                    <form action={approveVisit.bind(null, visit.id)}>
                      <SubmitButton className="btn btn-primary btn-sm" pendingText="...">
                        Onayla
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAdminApprovals && (
            <div className="card">
              <div className="card-head">
                <p className="card-title">
                  Son onayını bekleyenler{currentAdmin?.department ? ` (${currentAdmin.department})` : ""}
                </p>
              </div>
              {pendingAdminApprovals.length === 0 && (
                <EmptyState icon={CheckCircle2} title="Her şey tamam" message="Sizi bekleyen bir şey yok." />
              )}
              {pendingAdminApprovals.map((visit) => (
                <div className="approval-row" key={visit.id}>
                  <span className="avatar-chip">{initials(visit.visitor.name)}</span>
                  <div className="approval-row-text">
                    <p className="approval-row-name">{visit.visitor.name}</p>
                    <p className="approval-row-meta">
                      {visit.hostEmployee.name} onayladı, senin onayını bekliyor
                    </p>
                  </div>
                  <div className="approval-row-actions">
                    <form action={approveVisitByAdmin.bind(null, visit.id)}>
                      <SubmitButton className="btn btn-primary btn-sm" pendingText="...">
                        Onayla
                      </SubmitButton>
                    </form>
                  </div>
                  <form action={rejectVisitByAdmin.bind(null, visit.id)} className="admin-reject-form">
                    <textarea
                      className="form-input"
                      name="reason"
                      placeholder="Neden reddediyorsunuz? (zorunlu)"
                      rows={2}
                      required
                    />
                    <SubmitButton className="btn btn-secondary btn-sm" pendingText="...">
                      <XCircle size={14} strokeWidth={2} /> Reddet
                    </SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          )}

          {showRoomRequests && (
            <div className="card">
              <div className="card-head">
                <p className="card-title">Bekleyen oda talepleri</p>
              </div>
              {pendingRoomRequests.length === 0 && (
                <EmptyState icon={DoorOpen} title="Oda talebi yok" message="Sizi bekleyen bir şey yok." />
              )}
              {pendingRoomRequests.map((booking) => (
                <div className="approval-row" key={booking.id}>
                  <span className="avatar-chip">{initials(booking.requestedBy.name)}</span>
                  <div className="approval-row-text">
                    <p className="approval-row-name">
                      {booking.requestedBy.name} · {booking.room.name}
                    </p>
                    <p className="approval-row-meta">
                      {booking.startTime.toLocaleString()} - {booking.endTime.toLocaleTimeString()}
                    </p>
                    <p className="approval-row-meta">
                      Amaç: {booking.purpose}
                      {booking.visit
                        ? ` · ${booking.visit.visitor.name}, ${booking.visit.hostEmployee.name} adlı çalışanı ziyaret ediyor`
                        : ""}
                    </p>
                  </div>
                  <div className="approval-row-actions">
                    <form action={rejectRoomBooking.bind(null, booking.id)}>
                      <SubmitButton className="btn btn-secondary btn-sm" pendingText="...">
                        Reddet
                      </SubmitButton>
                    </form>
                    <form action={approveRoomBooking.bind(null, booking.id)}>
                      <SubmitButton className="btn btn-primary btn-sm" pendingText="...">
                        Onayla
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showTodaysVisits && (
            <div className="card">
              <div className="card-head">
                <p className="card-title">Bugünkü ziyaretler</p>
              </div>
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
                              <SubmitButton className="btn btn-primary btn-sm" pendingText="...">
                                <LogIn size={14} strokeWidth={2} /> Girişi onayla
                              </SubmitButton>
                            </form>
                          )}
                          {visit.status === "CHECKED_IN" && (
                            <form action={checkOutVisit.bind(null, visit.id)}>
                              <SubmitButton className="btn btn-primary btn-sm" pendingText="...">
                                <LogOut size={14} strokeWidth={2} /> Çıkışı onayla
                              </SubmitButton>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {showRoomStatus && (
          <div className="card" style={{ alignSelf: "start" }}>
            <div className="card-head">
              <p className="card-title">Toplantı odaları</p>
            </div>
            {rooms.length === 0 && <EmptyState icon={DoorOpen} title="Henüz oda yok" message="Bir yönetici oda eklediğinde burada görünecek." />}
            {rooms.map((room) => {
              const active = room.bookings[0];
              const busy = Boolean(active);
              return (
                <div key={room.id} className={`room-status-card ${busy ? "room-status-card-busy" : "room-status-card-free"}`}>
                  <span className="room-status-name">{room.name}</span>
                  <span className="room-status-meta">
                    {busy ? `Dolu · ${active!.endTime.toLocaleTimeString()}'e kadar` : "Müsait"}
                  </span>
                </div>
              );
            })}
            {rooms.length > 0 && (
              <a href="/staff/rooms" className="btn btn-primary" style={{ width: "100%" }}>
                Odalara git
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
