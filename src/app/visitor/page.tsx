// /visitor — the visitor request form, moved here from the home page
// so the home page can be a landing screen with 3 entry points.
import { prisma } from "@/lib/prisma";
import { VisitRequestForm } from "@/components/VisitRequestForm";

export const dynamic = "force-dynamic";

export default async function VisitorPage() {
  const hosts = await prisma.staff.findMany({
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="page-container">
      <h1>Ziyaret talep et</h1>
      <p>Kimi ve ne zaman ziyaret edeceğinizi bize bildirin, onay için iletelim.</p>
      <VisitRequestForm hosts={hosts} />
    </main>
  );
}
