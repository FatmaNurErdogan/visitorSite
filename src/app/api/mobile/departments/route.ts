import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobileAuth";
import { createDepartmentCore, listDepartments } from "@/actions/departments";

// Personel formundaki "Departman" seçim listesinin kaynağı — herhangi bir
// giriş yapmış personel görebilir (staff-users sayfasının eşleniği gibi).
export async function GET(req: Request) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const departments = await listDepartments();
  return NextResponse.json({ departments });
}

// Sadece ADMIN yeni departman ekleyebilir.
export async function POST(req: Request) {
  const user = await getMobileUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: user ? 403 : 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await createDepartmentCore(body.name);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
