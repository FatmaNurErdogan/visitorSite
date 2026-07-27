import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { approveVisit, rejectVisit, checkInVisit, checkOutVisit } from "@/actions/visits";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";

const STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "EXPIRED"];

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

  const canRespond = (hostEmployeeId: string) => role === "ADMIN" || userId === hostEmployeeId;
  const canCheckInOut = role === "ADMIN" || role === "RECEPTIONIST";

  return (
    <main className="staff-visits-page page-container-wide">
      <h1>Visits</h1>
      <p>
        <Link href="/staff/dashboard">Dashboard</Link> &middot; <Link href="/staff/visits/new">Log a walk-in</Link>
      </p>

      <form method="get">
        <label className="form-label" htmlFor="status">
          Filter by status
        </label>{" "}
        <select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>{" "}
        <button className="btn btn-secondary" type="submit">
          Filter
        </button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Visitor</th>
            <th>Company</th>
            <th>Host</th>
            <th>Reason</th>
            <th>Scheduled</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => (
            <tr key={visit.id}>
              <td>{visit.visitor.name}</td>
              <td>{visit.visitor.company || "-"}</td>
              <td>{visit.hostEmployee.name}</td>
              <td>{visit.visitReason}</td>
              <td>{visit.scheduledAt.toLocaleString()}</td>
              <td>
                <StatusBadge status={visit.status} />
              </td>
              <td>
                {visit.status === "PENDING" && canRespond(visit.hostEmployeeId) && (
                  <>
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
                  </>
                )}
                {visit.status === "ACCEPTED" && canCheckInOut && (
                  <form action={checkInVisit.bind(null, visit.id)}>
                    <SubmitButton className="btn btn-primary" pendingText="Checking in...">
                      Check in
                    </SubmitButton>
                  </form>
                )}
                {visit.status === "CHECKED_IN" && canCheckInOut && (
                  <form action={checkOutVisit.bind(null, visit.id)}>
                    <SubmitButton className="btn btn-primary" pendingText="Checking out...">
                      Check out
                    </SubmitButton>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
