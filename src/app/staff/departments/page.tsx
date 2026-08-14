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
        <h1>Not authorized</h1>
        <p>Only admins can manage departments.</p>
        <Link href="/staff/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  const departments = await listDepartments();

  return (
    <main className="staff-users-page page-container-wide">
      <h1>Departments</h1>
      <p>
        <Link href="/staff/dashboard">Dashboard</Link> &middot; <Link href="/staff/staff-users">Staff accounts</Link>
      </p>

      <DepartmentForm />

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {departments.length === 0 && (
            <tr>
              <td>No departments yet.</td>
            </tr>
          )}
          {departments.map((department) => (
            <tr key={department.id}>
              <td data-label="Name">{department.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
