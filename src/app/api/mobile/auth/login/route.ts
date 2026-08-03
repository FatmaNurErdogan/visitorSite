import { NextResponse } from "next/server";
import { verifyStaffCredentials } from "@/lib/verifyStaffCredentials";
import { signMobileToken } from "@/lib/mobileAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password, expectedRole } = body as {
    email?: string;
    password?: string;
    expectedRole?: string;
  };

  const staff = await verifyStaffCredentials(email, password, expectedRole);
  if (!staff) {
    return NextResponse.json({ error: "Invalid email or password, or this account doesn't have access from this login." }, { status: 401 });
  }

  const token = await signMobileToken({
    sub: staff.id,
    role: staff.role,
    name: staff.name,
    email: staff.email,
  });

  return NextResponse.json({ token, staff });
}
