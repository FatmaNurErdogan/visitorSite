// Shared shell for every /staff/* page — persistent sidebar nav instead of
// each page repeating its own "Dashboard · Visits · ..." text-link row.
import { auth } from "@/auth";
import { StaffNav } from "@/components/StaffNav";
import { BfcacheGuard } from "@/components/BfcacheGuard";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="staff-shell">
      <BfcacheGuard />
      <StaffNav role={session?.user?.role} name={session?.user?.name ?? undefined} />
      <div className="staff-main">{children}</div>
    </div>
  );
}
