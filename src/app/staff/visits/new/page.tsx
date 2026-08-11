import { prisma } from "@/lib/prisma";
import { VisitRequestForm } from "@/components/VisitRequestForm";

export const dynamic = "force-dynamic";

export default async function NewVisitPage() {
  const hosts = await prisma.staff.findMany({
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="page-container">
      <h1>Log a walk-in visit</h1>
      <p>Use this to register a visitor who&apos;s arrived without a prior request.</p>
      <VisitRequestForm hosts={hosts} />
    </main>
  );
}
