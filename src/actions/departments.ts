"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Departmanları yönetme yetkiniz yok.");
  }
}

export type DepartmentFormState = { error?: string; success?: boolean };

export async function listDepartments() {
  return prisma.department.findMany({ orderBy: { name: "asc" } });
}

// Doğrulama + oluşturma mantığı. Hem web form action'ı hem mobil API
// route'u (src/app/api/mobile/departments) bunu çağırır; yetki kontrolü
// (sadece ADMIN) çağıranın işi. Staff.department'a FK değil — bu tablo
// sadece personel formundaki seçim listesinin kaynağı (bkz. schema.prisma).
export async function createDepartmentCore(name: string): Promise<DepartmentFormState> {
  const trimmed = name?.trim();
  if (!trimmed) {
    return { error: "Lütfen departmana bir ad verin." };
  }

  const existing = await prisma.department.findUnique({ where: { name: trimmed } });
  if (existing) {
    return { error: "Bu adda bir departman zaten var." };
  }

  await prisma.department.create({ data: { name: trimmed } });
  return { success: true };
}

export async function createDepartment(
  _prevState: DepartmentFormState | undefined,
  formData: FormData
): Promise<DepartmentFormState> {
  await requireAdmin();

  const result = await createDepartmentCore(formData.get("name") as string);

  if (result.success) {
    revalidatePath("/staff/departments");
    revalidatePath("/staff/staff-users");
  }

  return result;
}
