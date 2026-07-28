"use server";

// Sadece ADMIN yeni personel (employee/receptionist/admin) hesabı oluşturabilir.
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CreateStaffState = {
  error?: string;
  success?: boolean;
};

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Not authorized to manage staff accounts.");
  }
}

export async function createStaffAccount(
  _prevState: CreateStaffState | undefined,
  formData: FormData
): Promise<CreateStaffState> {
  await requireAdmin();

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name || !email || !password || !role) {
    return { error: "Please fill in all fields." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (!["ADMIN", "EMPLOYEE", "RECEPTIONIST"].includes(role)) {
    return { error: "Please pick a valid role." };
  }

  const existing = await prisma.staff.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.staff.create({
    data: { name, email, passwordHash, role },
  });

  revalidatePath("/staff/staff-users");

  return { success: true };
}
