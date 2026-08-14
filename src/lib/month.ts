// "YYYY-MM" formatındaki bir ay parametresini (ör. /staff/rooms?month=2026-08
// ve mobil /api/mobile/rooms/calendar?month=2026-08) [monthStart, monthEnd)
// aralığına çevirir. Geçersiz/eksikse mevcut aya düşer.
export function parseMonthParam(raw: string | undefined | null) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-12

  const match = raw ? /^(\d{4})-(\d{2})$/.exec(raw) : null;
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    if (m >= 1 && m <= 12) {
      year = y;
      month = m;
    }
  }

  return {
    year,
    month,
    monthStart: new Date(year, month - 1, 1),
    monthEnd: new Date(year, month, 1),
  };
}

export function formatMonthParam(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// Önceki/sonraki ay için { year, month } — Aralık→Ocak ve Ocak→Aralık geçişini
// de doğru taşır.
export function shiftMonth(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (((total % 12) + 12) % 12) + 1 };
}
