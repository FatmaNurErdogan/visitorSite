export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Beklemede",
  PENDING_ADMIN_APPROVAL: "Yönetici onayı bekleniyor",
  ACCEPTED: "Onaylandı",
  REJECTED: "Reddedildi",
  CHECKED_IN: "Giriş yapıldı",
  CHECKED_OUT: "Çıkış yapıldı",
  CANCELLED: "İptal edildi",
  EXPIRED: "Süresi doldu",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABELS[status] ?? status}</span>;
}
