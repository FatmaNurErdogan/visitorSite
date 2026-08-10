import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isChatOpen, listMessagesCore, sendStaffMessageCore } from "@/actions/messages";

// Kept separate from isChatOpen: "who are you" (401/403) and "does this
// visit even exist" (404) are checked before "is chat open for this visit"
// (409) further down in GET/POST — an unauthorized caller shouldn't learn
// anything about the visit's status.
async function authorizeStaffChat(visitId: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) {
    return { error: "Visit not found.", status: 404 as const };
  }

  const role = session.user.role;
  const userId = session.user.id;
  if (role !== "ADMIN" && userId !== visit.hostEmployeeId) {
    return { error: "Only the host or an admin can open this chat.", status: 403 as const };
  }

  return { visit, staffId: userId as string };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await authorizeStaffChat(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (!isChatOpen(result.visit.status)) {
    return NextResponse.json({ error: "Chat isn't open for this visit." }, { status: 409 });
  }

  const messages = await listMessagesCore(id);
  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await authorizeStaffChat(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (!isChatOpen(result.visit.status)) {
    return NextResponse.json({ error: "Chat isn't open for this visit." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  const message = await sendStaffMessageCore(id, result.staffId, text);
  return NextResponse.json({ message }, { status: 201 });
}
