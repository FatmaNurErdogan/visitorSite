import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rejectVisit } from "@/actions/visits";
import { ApproveVisitForm } from "@/components/ApproveVisitForm";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ApproveVisitPage({ params }: { params: Promise<{ id: string }> }) {
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
        <h1>Visit not found</h1>
        <Link href="/staff/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  if (role !== "ADMIN" && userId !== visit.hostEmployeeId) {
    return (
      <main className="page-container">
        <h1>Not authorized</h1>
        <p>Only the host or an admin can respond to this visit request.</p>
        <Link href="/staff/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  const lastRejectedTicket =
    visit.status === "PENDING"
      ? await prisma.roomBooking.findFirst({
          where: { visitId: id, status: "REJECTED" },
          orderBy: { respondedAt: "desc" },
          include: { room: true },
        })
      : null;

  const rooms = await prisma.meetingRoom.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="page-container">
      <h1>Approve visit</h1>
      <p>
        <Link href="/staff/dashboard">Back to dashboard</Link>
      </p>

      <div className="card">
        <p>
          <strong>{visit.visitor.name}</strong> ({visit.visitor.company || "no company"}) wants to visit{" "}
          {visit.hostEmployee.name} on {visit.scheduledAt.toLocaleString()}
        </p>
        <p>Reason: {visit.visitReason}</p>
        <p>
          Status: <StatusBadge status={visit.status} />
        </p>
      </div>

      {visit.status !== "PENDING" ? (
        <p>This visit request has already been processed.</p>
      ) : (
        <>
          {lastRejectedTicket && (
            <p className="form-error">
              A previous room request ({lastRejectedTicket.room.name}) was declined. Pick a different room or time
              and try again.
            </p>
          )}

          {rooms.length === 0 ? (
            <p>No meeting rooms exist yet — ask an admin to add one before approving.</p>
          ) : (
            <ApproveVisitForm
              visitId={visit.id}
              rooms={rooms}
              scheduledAt={visit.scheduledAt.toISOString()}
              requiresApproval={role !== "ADMIN"}
            />
          )}

          <form action={rejectVisit.bind(null, visit.id)}>
            <SubmitButton className="btn btn-danger" pendingText="Rejecting...">
              Reject visit
            </SubmitButton>
          </form>
        </>
      )}
    </main>
  );
}
