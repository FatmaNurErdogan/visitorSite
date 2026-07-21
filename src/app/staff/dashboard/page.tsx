import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { approveVisit, rejectVisit, checkInVisit, checkOutVisit } from "@/actions/visits";
import { StatusBadge } from "@/components/StatusBadge";

export default async function StaffDashboardPage() {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  const showApprovals = role === "EMPLOYEE" || role === "ADMIN";
  const showTodaysVisits = role === "RECEPTIONIST" || role === "ADMIN";

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
        <Link href="/staff/visits">All visits</Link> &middot; <Link href="/staff/visits/new">Log a walk-in</Link>
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
                <button className="btn btn-success" type="submit">
                  Approve
                </button>
              </form>{" "}
              <form action={rejectVisit.bind(null, visit.id)} style={{ display: "inline" }}>
                <button className="btn btn-danger" type="submit">
                  Reject
                </button>
              </form>
            </div>
          ))}
        </section>
      )}

      {showTodaysVisits && (
        <section>
          <h2>Today&apos;s visits</h2>
          {todaysVisits.length === 0 && <p>No visits to handle right now.</p>}
          {todaysVisits.map((visit) => (
            <div className="card" key={visit.id}>
              <p>
                <strong>{visit.visitor.name}</strong> visiting {visit.hostEmployee.name} &mdash;{" "}
                <StatusBadge status={visit.status} />
              </p>
              {visit.status === "ACCEPTED" && (
                <form action={checkInVisit.bind(null, visit.id)}>
                  <button className="btn btn-primary" type="submit">
                    Check in
                  </button>
                </form>
              )}
              {visit.status === "CHECKED_IN" && (
                <form action={checkOutVisit.bind(null, visit.id)}>
                  <button className="btn btn-primary" type="submit">
                    Check out
                  </button>
                </form>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
