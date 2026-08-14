import { NextResponse } from "next/server";
import { verifyStaffCredentials } from "@/lib/verifyStaffCredentials";
import { signMobileToken } from "@/lib/mobileAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { email, password, expectedRole } = body as {
    email?: string;
    password?: string;
    expectedRole?: string;
  };

  const staff = await verifyStaffCredentials(email, password, expectedRole);
  if (!staff) {
    return NextResponse.json({ error: "E-posta veya şifre hatalı, ya da bu hesabın bu girişten erişimi yok." }, { status: 401 });
  }

  const token = await signMobileToken({
    sub: staff.id,
    role: staff.role,
    name: staff.name,
    email: staff.email,
  });

  return NextResponse.json({ token, staff });
}
