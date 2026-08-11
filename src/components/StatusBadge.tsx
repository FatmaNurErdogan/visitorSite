const LABELS: Record<string, string> = {
  PENDING: "Pending",
  PENDING_ADMIN_APPROVAL: "Awaiting admin approval",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{LABELS[status] ?? status}</span>;
}
