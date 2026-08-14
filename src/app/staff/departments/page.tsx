// /staff/departments — ADMIN only. Lists existing departments and lets an
// admin add new ones; this is the list the staff-account form's
// "Department" dropdown pulls from (bkz. src/components/StaffAccountForm.tsx).
import Link from "next/link";
import { auth } from "@/auth";
import { listDepartments } from "@/actions/departments";
import { DepartmentForm } from "@/components/DepartmentForm";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return (
      <main className="page-container">
        <h1>Yetkiniz yok</h1>
        <p>Departmanları yalnızca yöneticiler yönetebilir.</p>
        <Link href="/staff/dashboard">Panele dön</Link>
      </main>
    );
  }

  const departments = await listDepartments();

  return (
    <main className="staff-users-page page-container-wide">
      <h1>Departmanlar</h1>

      <DepartmentForm />

      <table className="table">
        <thead>
          <tr>
            <th>Ad</th>
          </tr>
        </thead>
        <tbody>
          {departments.length === 0 && (
            <tr>
              <td>Henüz departman yok.</td>
            </tr>
          )}
          {departments.map((department) => (
            <tr key={department.id}>
              <td data-label="Ad">{department.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
