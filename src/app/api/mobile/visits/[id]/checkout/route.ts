import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobileAuth";
import { checkOutVisitCore } from "@/actions/visits";
import { isRecordNotFoundError } from "@/lib/prismaErrors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "RECEPTIONIST") {
    return NextResponse.json({ error: "Not authorized to check visitors out." }, { status: 403 });
  }

  const { id } = await params;

  try {
    await checkOutVisitCore(id);
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "This visit isn't awaiting check-out (already processed or not found)." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
