// Email/şifre/expectedRole kontrolü — hem web login'i (NextAuth, src/auth.ts)
// hem mobil login endpoint'i (src/app/api/mobile/auth/login) bunu kullanır.
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function verifyStaffCredentials(
  email: string | undefined,
  password: string | undefined,
  expectedRole?: string
) {
  if (!email || !password) return null;

  const staff = await prisma.staff.findUnique({ where: { email } });
  if (!staff) return null;

  const passwordMatches = await bcrypt.compare(password, staff.passwordHash);
  if (!passwordMatches) return null;

  // ADMIN her iki kapıdan da girebilir. EMPLOYEE sadece "employee" kapısından,
  // RECEPTIONIST sadece "receptionist" kapısından girebilir.
  if (
    expectedRole &&
    staff.role !== "ADMIN" &&
    staff.role.toLowerCase() !== expectedRole.toLowerCase()
  ) {
    return null;
  }

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
  };
}
