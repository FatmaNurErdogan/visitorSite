// /staff/staff-users — ADMIN only. Lists existing staff accounts and lets
// an admin create new ones (employee/receptionist/admin) without needing
// a database script.
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listDepartments } from "@/actions/departments";
import { StaffAccountForm } from "@/components/StaffAccountForm";
import { ROLE_LABELS } from "@/lib/roleLabels";

export const dynamic = "force-dynamic";

export default async function StaffUsersPage() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return (
      <main className="page-container">
        <h1>Yetkiniz yok</h1>
        <p>Personel hesaplarını yalnızca yöneticiler yönetebilir.</p>
        <Link href="/staff/dashboard">Panele dön</Link>
      </main>
    );
  }

  const [staff, departments] = await Promise.all([
    prisma.staff.findMany({ orderBy: { name: "asc" } }),
    listDepartments(),
  ]);

  return (
    <main className="staff-users-page page-container-wide">
      <h1>Personel Hesapları</h1>

      <StaffAccountForm departments={departments} />

      <table className="table">
        <thead>
          <tr>
            <th>Ad</th>
            <th>E-posta</th>
            <th>Rol</th>
            <th>Departman</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id}>
              <td data-label="Ad">{member.name}</td>
              <td data-label="E-posta">{member.email}</td>
              <td data-label="Rol">{ROLE_LABELS[member.role] ?? member.role}</td>
              <td data-label="Departman">{member.department || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
