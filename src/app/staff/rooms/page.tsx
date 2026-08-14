import Link from "next/link";
import { Plus, CalendarPlus, Ban } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cancelDirectRoomBooking, getRoomBookingsForMonth } from "@/actions/rooms";
import { SubmitButton } from "@/components/SubmitButton";
import { formatMonthParam, parseMonthParam, shiftMonth } from "@/lib/month";

export const dynamic = "force-dynamic";

const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

// Google Calendar'daki gibi odaya göre renklendirme — hangi rengin hangi
// odaya düştüğü bir ay içinde sabit kalsın diye roomId'lerin sıralı
// listesindeki index'ine göre seçiliyor (bkz. CalendarSection).
const CALENDAR_PALETTE = [
  { bg: "#d4edda", ink: "#1a7f37" },
  { bg: "#cfe2ff", ink: "#084298" },
  { bg: "#fff3cd", ink: "#7a5b00" },
  { bg: "#f8d7da", ink: "#b3261e" },
  { bg: "#e5d9f8", ink: "#6f42c1" },
  { bg: "#ffe1c7", ink: "#c97b3d" },
];

const MAX_CHIPS_PER_DAY = 3;

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
      <div className="page-header-row">
        <h1>Toplantı odaları</h1>
        {isAdmin && (
          <Link href="/staff/rooms/new" className="btn btn-secondary">
            <Plus size={15} strokeWidth={2} /> Oda ekle
          </Link>
        )}
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Oda</th>
            <th>Konum</th>
            <th>Kapasite</th>
            <th>Özellikler</th>
            <th>Durum</th>
            <th>Kullanan</th>
            <th>Talep</th>
            {isAdmin && <th>İşlemler</th>}
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
                ? `${booking.visit.visitor.name} (${booking.visit.hostEmployee.name} adlı çalışanı ziyaret ediyor)`
                : `${booking.requestedBy.name} (dahili toplantı)`;

            return (
              <tr key={room.id}>
                <td data-label="Oda">{room.name}</td>
                <td data-label="Konum">{room.location || "-"}</td>
                <td data-label="Kapasite">{room.capacity ?? "-"}</td>
                <td data-label="Özellikler">{room.perks || "-"}</td>
                <td data-label="Durum">
                  {current ? (
                    <span className="badge badge-checked_in">{current.endTime.toLocaleTimeString()} saatine kadar dolu</span>
                  ) : (
                    <span className="badge badge-accepted">Müsait</span>
                  )}
                </td>
                <td data-label="Kullanan">
                  {current
                    ? usedByLabel(current)
                    : next
                      ? `Sıradaki: ${next.startTime.toLocaleString()} — ${usedByLabel(next)}`
                      : "-"}
                </td>
                <td data-label="Talep">
                  <Link href={`/staff/rooms/${room.id}/request`} className="btn btn-secondary btn-sm">
                    <CalendarPlus size={13} strokeWidth={2} /> Talep et
                  </Link>
                </td>
                {isAdmin && (
                  <td data-label="İşlemler">
                    <Link href={`/staff/rooms/${room.id}/book`} className="btn btn-secondary btn-sm">
                      <CalendarPlus size={13} strokeWidth={2} /> Rezerve et
                    </Link>
                    {cancellable && (
                      <>
                        {" "}
                        <form action={cancelDirectRoomBooking.bind(null, cancellable.id)} style={{ display: "inline" }}>
                          <SubmitButton className="btn btn-danger btn-sm" pendingText="İptal ediliyor...">
                            <Ban size={13} strokeWidth={2} /> İptal et
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
  const monthLabel = monthStart.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  const selectedDay = dayParam && bookingsByDay.has(dayParam) ? dayParam : undefined;
  const selectedBookings = selectedDay ? bookingsByDay.get(selectedDay)! : [];

  // Odaya göre sabit bir renk ataması — bkz. CALENDAR_PALETTE.
  const roomIds = Array.from(new Set(bookings.map((b) => b.roomId))).sort();
  const colorForRoom = (roomId: string) => CALENDAR_PALETTE[roomIds.indexOf(roomId) % CALENDAR_PALETTE.length];

  return (
    <section className="calendar-section">
      <div className="calendar-nav">
        <Link href={`/staff/rooms?month=${formatMonthParam(prevYear, prevMonth)}`}>&larr; Önceki</Link>
        <h2>{monthLabel}</h2>
        <Link href={`/staff/rooms?month=${formatMonthParam(nextYear, nextMonth)}`}>Sonraki &rarr;</Link>
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
          const dayBookings = bookingsByDay.get(key) ?? [];
          const count = dayBookings.length;
          const classNames = ["calendar-day"];
          if (count > 0) classNames.push("calendar-day-has-bookings");
          if (key === selectedDay) classNames.push("calendar-day-selected");
          if (key === dayKey(today)) classNames.push("calendar-day-today");

          const inner = (
            <>
              <span className="calendar-day-number">{date.getDate()}</span>
              <div className="calendar-day-events">
                {dayBookings.slice(0, MAX_CHIPS_PER_DAY).map((booking) => {
                  const color = colorForRoom(booking.roomId);
                  return (
                    <span
                      key={booking.id}
                      className="calendar-event-chip"
                      style={{ background: color.bg, color: color.ink }}
                    >
                      {booking.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                      {booking.roomName}
                    </span>
                  );
                })}
                {count > MAX_CHIPS_PER_DAY && <span className="calendar-more">+{count - MAX_CHIPS_PER_DAY} tane daha</span>}
              </div>
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
          <h3>{selectedDay} tarihindeki rezervasyonlar</h3>
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
