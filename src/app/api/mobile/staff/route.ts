import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobileAuth";
import { createStaffAccountCore } from "@/actions/staff";

// staff-users sayfasının eşleniği — sadece ADMIN.
export async function GET(req: Request) {
  const user = await getMobileUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: user ? 403 : 401 });
  }

  const staff = await prisma.staff.findMany({
    select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ staff });
}

export async function POST(req: Request) {
  const user = await getMobileUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: user ? 403 : 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await createStaffAccountCore({
    name: body.name,
    email: body.email,
    password: body.password,
    role: body.role,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
