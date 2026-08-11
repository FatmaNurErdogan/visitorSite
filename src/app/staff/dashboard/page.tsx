import Link from "next/link";
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
      <h1>Dashboard</h1>
      <p>
        <Link href="/staff/visits">All visits</Link> &middot; <Link href="/staff/visits/new">Log a walk-in</Link>{" "}
        &middot; <Link href="/staff/rooms">Meeting rooms</Link>
        {role === "ADMIN" && (
          <>
            {" "}
            &middot; <Link href="/staff/staff-users">Staff accounts</Link>
          </>
        )}
      </p>

      {showApprovals && (
        <section>
          <h2>Pending your approval</h2>
          {pendingApprovals.length === 0 && <p>Nothing waiting on you.</p>}
          {pendingApprovals.map((visit) => (
            <div className="card" key={visit.id}>
              <p>
                <strong>{visit.visitor.name}</strong> ({visit.visitor.company || "no company"}) wants to visit{" "}
                {visit.hostEmployee.name} on {visit.scheduledAt.toLocaleString()}
              </p>
              <p>Reason: {visit.visitReason}</p>
              <form action={approveVisit.bind(null, visit.id)} style={{ display: "inline" }}>
                <SubmitButton className="btn btn-success" pendingText="Approving...">
                  Approve
                </SubmitButton>
              </form>{" "}
              <form action={rejectVisit.bind(null, visit.id)} style={{ display: "inline" }}>
                <SubmitButton className="btn btn-danger" pendingText="Rejecting...">
                  Reject
                </SubmitButton>
              </form>
            </div>
          ))}
        </section>
      )}

      {showAdminApprovals && (
        <section>
          <h2>Pending your final approval{currentAdmin?.department ? ` (${currentAdmin.department})` : ""}</h2>
          <p>These were already approved by the host employee and are waiting on you before the visitor is notified.</p>
          {pendingAdminApprovals.length === 0 && <p>Nothing waiting on you.</p>}
          {pendingAdminApprovals.map((visit) => (
            <div className="card" key={visit.id}>
              <p>
                <strong>{visit.visitor.name}</strong> ({visit.visitor.company || "no company"}) wants to visit{" "}
                {visit.hostEmployee.name} on {visit.scheduledAt.toLocaleString()}
              </p>
              <p>Reason: {visit.visitReason}</p>
              <form action={approveVisitByAdmin.bind(null, visit.id)} style={{ display: "inline" }}>
                <SubmitButton className="btn btn-success" pendingText="Approving...">
                  Approve
                </SubmitButton>
              </form>
              <form action={rejectVisitByAdmin.bind(null, visit.id)} className="admin-reject-form">
                <textarea
                  className="form-input"
                  name="reason"
                  placeholder="Why are you rejecting this? (required)"
                  rows={2}
                  required
                />
                <SubmitButton className="btn btn-danger" pendingText="Rejecting...">
                  Reject
                </SubmitButton>
              </form>
            </div>
          ))}
        </section>
      )}

      {showRoomRequests && (
        <section>
          <h2>Pending room requests</h2>
          {pendingRoomRequests.length === 0 && <p>No room requests waiting on you.</p>}
          {pendingRoomRequests.map((booking) => (
            <div className="card" key={booking.id}>
              <p>
                <strong>{booking.requestedBy.name}</strong> requested <strong>{booking.room.name}</strong> from{" "}
                {booking.startTime.toLocaleString()} to {booking.endTime.toLocaleTimeString()}
              </p>
              {booking.visit && (
                <p>
                  For: {booking.visit.visitor.name} visiting {booking.visit.hostEmployee.name}
                </p>
              )}
              <p>Purpose: {booking.purpose}</p>
              <form action={approveRoomBooking.bind(null, booking.id)} style={{ display: "inline" }}>
                <SubmitButton className="btn btn-success" pendingText="Approving...">
                  Approve
                </SubmitButton>
              </form>{" "}
              <form action={rejectRoomBooking.bind(null, booking.id)} style={{ display: "inline" }}>
                <SubmitButton className="btn btn-danger" pendingText="Rejecting...">
                  Reject
                </SubmitButton>
              </form>
            </div>
          ))}
        </section>
      )}

      {showTodaysVisits && (
        <section>
          <h2>Today&apos;s visits</h2>
          {todaysVisits.length === 0 && <p>No visits to handle right now.</p>}
          {todaysVisits.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Host</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {todaysVisits.map((visit) => (
                  <tr key={visit.id}>
                    <td data-label="Visitor">{visit.visitor.name}</td>
                    <td data-label="Host">{visit.hostEmployee.name}</td>
                    <td data-label="Date">{visit.scheduledAt.toLocaleDateString()}</td>
                    <td data-label="Time">{visit.scheduledAt.toLocaleTimeString()}</td>
                    <td data-label="Status">
                      <StatusBadge status={visit.status} />
                    </td>
                    <td data-label="Action">
                      {visit.status === "ACCEPTED" && (
                        <form action={checkInVisit.bind(null, visit.id)}>
                          <SubmitButton className="btn btn-primary" pendingText="Confirming...">
                            Confirm arrival
                          </SubmitButton>
                        </form>
                      )}
                      {visit.status === "CHECKED_IN" && (
                        <form action={checkOutVisit.bind(null, visit.id)}>
                          <SubmitButton className="btn btn-primary" pendingText="Confirming...">
                            Confirm exit
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
