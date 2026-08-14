import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cancelDirectRoomBooking, getRoomBookingsForMonth } from "@/actions/rooms";
import { SubmitButton } from "@/components/SubmitButton";
import { formatMonthParam, parseMonthParam, shiftMonth } from "@/lib/month";

export const dynamic = "force-dynamic";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function MeetingRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const { month: monthParam, day: dayParam } = await searchParams;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const now = new Date();

  const rooms = await prisma.meetingRoom.findMany({
    orderBy: { name: "asc" },
    include: {
      bookings: {
        // Sadece devam eden/gelecekteki rezervasyonlar — bkz. aynı filtre
        // /api/mobile/rooms route'unda, sorgunun sınırsız büyümesini önlüyor.
        where: { status: "APPROVED", endTime: { gte: now } },
        orderBy: { startTime: "asc" },
        include: {
          requestedBy: true,
          visit: { include: { visitor: true, hostEmployee: true } },
        },
      },
    },
  });

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

      <CalendarSection monthParam={monthParam} dayParam={dayParam} today={now} />
    </main>
  );
}

async function CalendarSection({
  monthParam,
  dayParam,
  today,
}: {
  monthParam?: string;
  dayParam?: string;
  today: Date;
}) {
  const { year, month, monthStart, monthEnd } = parseMonthParam(monthParam);
  const bookings = await getRoomBookingsForMonth(monthStart, monthEnd);

  const bookingsByDay = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const key = dayKey(booking.startTime);
    const list = bookingsByDay.get(key) ?? [];
    list.push(booking);
    bookingsByDay.set(key, list);
  }

  // Pazartesi başlangıçlı hafta ızgarası.
  const firstWeekday = (monthStart.getDay() + 6) % 7; // 0=Mon..6=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthParamValue = formatMonthParam(year, month);
  const { year: prevYear, month: prevMonth } = shiftMonth(year, month, -1);
  const { year: nextYear, month: nextMonth } = shiftMonth(year, month, 1);
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const selectedDay = dayParam && bookingsByDay.has(dayParam) ? dayParam : undefined;
  const selectedBookings = selectedDay ? bookingsByDay.get(selectedDay)! : [];

  return (
    <section className="calendar-section">
      <div className="calendar-nav">
        <Link href={`/staff/rooms?month=${formatMonthParam(prevYear, prevMonth)}`}>&larr; Prev</Link>
        <h2>{monthLabel}</h2>
        <Link href={`/staff/rooms?month=${formatMonthParam(nextYear, nextMonth)}`}>Next &rarr;</Link>
      </div>

      <div className="calendar-grid">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-weekday">
            {label}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="calendar-day calendar-day-empty" />;

          const key = dayKey(date);
          const count = bookingsByDay.get(key)?.length ?? 0;
          const classNames = ["calendar-day"];
          if (count > 0) classNames.push("calendar-day-has-bookings");
          if (key === selectedDay) classNames.push("calendar-day-selected");
          if (key === dayKey(today)) classNames.push("calendar-day-today");

          const inner = (
            <>
              <span className="calendar-day-number">{date.getDate()}</span>
              {count > 0 && <span className="calendar-day-count">{count}</span>}
            </>
          );

          if (count === 0) {
            return (
              <div key={i} className={classNames.join(" ")}>
                {inner}
              </div>
            );
          }

          return (
            <Link key={i} href={`/staff/rooms?month=${monthParamValue}&day=${key}`} className={classNames.join(" ")}>
              {inner}
            </Link>
          );
        })}
      </div>

      {selectedDay && (
        <div className="calendar-day-detail">
          <h3>Reservations on {selectedDay}</h3>
          {selectedBookings.map((booking) => (
            <div className="card" key={booking.id}>
              <p>
                <strong>{booking.roomName}</strong> —{" "}
                {booking.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–
                {booking.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p>{booking.label}</p>
              <p>{booking.purpose}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
