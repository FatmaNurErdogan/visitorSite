// /staff/staff-users — ADMIN only. Lists existing staff accounts and lets
// an admin create new ones (employee/receptionist/admin) without needing
// a database script.
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

  const staff = await prisma.staff.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="staff-users-page page-container-wide">
      <h1>Staff Accounts</h1>
      <p>
        <Link href="/staff/dashboard">Dashboard</Link>
      </p>

      <StaffAccountForm />

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id}>
              <td>{member.name}</td>
              <td>{member.email}</td>
              <td>{member.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
