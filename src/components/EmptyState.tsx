import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={26} strokeWidth={2} />
      </div>
      <p className="empty-state-title">{title}</p>
      {message && <p className="empty-state-message">{message}</p>}
    </div>
  );
}
