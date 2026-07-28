import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "EXPIRED"];

export default async function StaffVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const visits = await prisma.visit.findMany({
    where: status ? { status } : undefined,
    include: { visitor: true, hostEmployee: true },
    orderBy: { scheduledAt: "desc" },
  });

  return (
    <main className="staff-visits-page page-container-wide">
      <h1>Visits</h1>
      <p>
        <Link href="/staff/dashboard">Dashboard</Link> &middot; <Link href="/staff/visits/new">Log a walk-in</Link>
      </p>
      <p>Read-only log of every visit. Approve/reject requests and confirm arrivals/exits from the dashboard.</p>

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
            <th>Expected time</th>
            <th>Actual arrival/exit time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => (
            <tr key={visit.id}>
              <td data-label="Visitor">{visit.visitor.name}</td>
              <td data-label="Company">{visit.visitor.company || "-"}</td>
              <td data-label="Host">{visit.hostEmployee.name}</td>
              <td data-label="Reason">{visit.visitReason}</td>
              <td data-label="Expected time">{visit.scheduledAt.toLocaleString()}</td>
              <td data-label="Actual arrival/exit time">
                {visit.checkedInAt ? (
                  <>
                    {visit.checkedInAt.toLocaleTimeString()}
                    {visit.checkedOutAt && ` – ${visit.checkedOutAt.toLocaleTimeString()}`}
                  </>
                ) : (
                  "-"
                )}
              </td>
              <td data-label="Status">
                <StatusBadge status={visit.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
