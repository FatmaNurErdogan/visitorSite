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
      <h1>Kapıdan gelen ziyaretçi ekle</h1>
      <p>Önceden talep göndermeden gelen bir ziyaretçiyi kaydetmek için bunu kullanın.</p>
      <VisitRequestForm hosts={hosts} />
    </main>
  );
}
