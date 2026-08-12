import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cancelDirectRoomBooking } from "@/actions/rooms";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function MeetingRoomsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const rooms = await prisma.meetingRoom.findMany({
    orderBy: { name: "asc" },
    include: {
      bookings: {
        where: { status: "APPROVED" },
        orderBy: { startTime: "asc" },
        include: {
          requestedBy: true,
          visit: { include: { visitor: true, hostEmployee: true } },
        },
      },
    },
  });

  const now = new Date();

  return (
    <main className="staff-visits-page page-container-wide">
      <h1>Meeting rooms</h1>
      <p>
        <Link href="/staff/dashboard">Dashboard</Link>
        {isAdmin && (
          <>
            {" "}
            &middot; <Link href="/staff/rooms/new">Add a room</Link>
          </>
        )}
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Location</th>
            <th>Capacity</th>
            <th>Perks</th>
            <th>Status</th>
            <th>Used by</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => {
            const current = room.bookings.find((b) => b.startTime <= now && b.endTime > now);
            const next = room.bookings.find((b) => b.startTime > now);
            // Sadece ziyaretsiz (doğrudan) rezervasyonlar iptal edilebilir —
            // bkz. cancelDirectRoomBookingCore. Gösterilen (current ya da
            // next) hangisiyse onu teklif ediyoruz.
            const shown = current ?? next;
            const cancellable = shown && !shown.visit ? shown : undefined;

            const usedByLabel = (booking: (typeof room.bookings)[number]) =>
              booking.visit
                ? `${booking.visit.visitor.name} (visiting ${booking.visit.hostEmployee.name})`
                : `${booking.requestedBy.name} (internal meeting)`;

            return (
              <tr key={room.id}>
                <td data-label="Room">{room.name}</td>
                <td data-label="Location">{room.location || "-"}</td>
                <td data-label="Capacity">{room.capacity ?? "-"}</td>
                <td data-label="Perks">{room.perks || "-"}</td>
                <td data-label="Status">
                  {current ? (
                    <span className="badge badge-checked_in">In use until {current.endTime.toLocaleTimeString()}</span>
                  ) : (
                    <span className="badge badge-accepted">Available</span>
                  )}
                </td>
                <td data-label="Used by">
                  {current
                    ? usedByLabel(current)
                    : next
                      ? `Next: ${next.startTime.toLocaleString()} — ${usedByLabel(next)}`
                      : "-"}
                </td>
                {isAdmin && (
                  <td data-label="Actions">
                    <Link href={`/staff/rooms/${room.id}/book`}>Book</Link>
                    {cancellable && (
                      <>
                        {" "}
                        <form action={cancelDirectRoomBooking.bind(null, cancellable.id)} style={{ display: "inline" }}>
                          <SubmitButton className="btn btn-danger" pendingText="Cancelling...">
                            Cancel
                          </SubmitButton>
                        </form>
                      </>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
