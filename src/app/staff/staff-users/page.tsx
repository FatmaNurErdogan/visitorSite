// /staff/staff-users — ADMIN only. Lists existing staff accounts and lets
// an admin create new ones (employee/receptionist/admin) without needing
// a database script.
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listDepartments } from "@/actions/departments";
import { StaffAccountForm } from "@/components/StaffAccountForm";

export default async function StaffUsersPage() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return (
      <main className="page-container">
        <h1>Not authorized</h1>
        <p>Only admins can manage staff accounts.</p>
        <Link href="/staff/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  const [staff, departments] = await Promise.all([
    prisma.staff.findMany({ orderBy: { name: "asc" } }),
    listDepartments(),
  ]);

  return (
    <main className="staff-users-page page-container-wide">
      <h1>Staff Accounts</h1>
      <p>
        <Link href="/staff/dashboard">Dashboard</Link> &middot; <Link href="/staff/departments">Departments</Link>
      </p>

      <StaffAccountForm departments={departments} />

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id}>
              <td data-label="Name">{member.name}</td>
              <td data-label="Email">{member.email}</td>
              <td data-label="Role">{member.role}</td>
              <td data-label="Department">{member.department || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
