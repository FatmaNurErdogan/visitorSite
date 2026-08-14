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

export type CreateStaffAccountInput = {
  name: string;
  email: string;
  password: string;
  role: string;
  department?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Personel hesaplarını yönetme yetkiniz yok.");
  }
}

// Doğrulama + hesap oluşturma mantığı. Hem web form action'ı hem mobil
// API route'u (src/app/api/mobile/staff) bunu çağırır; yetki kontrolü
// çağıranın işi.
export async function createStaffAccountCore(input: CreateStaffAccountInput): Promise<CreateStaffState> {
  const name = input.name;
  const email = input.email?.trim().toLowerCase();
  const password = input.password;
  const role = input.role;

  if (!name || !email || !password || !role) {
    return { error: "Lütfen tüm alanları doldurun." };
  }

  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalı." };
  }

  if (!["ADMIN", "EMPLOYEE", "RECEPTIONIST"].includes(role)) {
    return { error: "Lütfen geçerli bir rol seçin." };
  }

  const existing = await prisma.staff.findUnique({ where: { email } });
  if (existing) {
    return { error: "Bu e-posta ile bir hesap zaten var." };
  }

  const department = input.department?.trim() || undefined;

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.staff.create({
    data: { name, email, passwordHash, role, department },
  });

  return { success: true };
}

export async function createStaffAccount(
  _prevState: CreateStaffState | undefined,
  formData: FormData
): Promise<CreateStaffState> {
  await requireAdmin();

  const result = await createStaffAccountCore({
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
    department: (formData.get("department") as string) || undefined,
  });

  if (result.success) {
    revalidatePath("/staff/staff-users");
  }

  return result;
}
