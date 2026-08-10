import { NextResponse } from "next/server";
import { getVisitByAccessToken, isChatOpen, listMessagesCore, sendVisitorMessageCore } from "@/actions/messages";

// Public — the visitor has no account, so the accessToken itself is the
// credential. A bad/expired token and a valid-but-closed-chat token get the
// same 404 on purpose, so this endpoint can't be used to probe which tokens
// exist.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const visit = await getVisitByAccessToken(token);
  if (!visit || !isChatOpen(visit.status)) {
    return NextResponse.json({ error: "Chat isn't available for this visit." }, { status: 404 });
  }

  const messages = await listMessagesCore(visit.id);
  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const visit = await getVisitByAccessToken(token);
  if (!visit || !isChatOpen(visit.status)) {
    return NextResponse.json({ error: "Chat isn't available for this visit." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  const message = await sendVisitorMessageCore(visit.id, text);
  return NextResponse.json({ message }, { status: 201 });
}
