import { NextResponse } from "next/server";
import {
  getVisitByAccessToken,
  isChatOpenForVisitor,
  listMessagesCore,
  sendVisitorMessageCore,
  validateMessageBody,
} from "@/actions/messages";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// Public — the visitor has no account, so the accessToken itself is the
// credential. A bad/expired token and a valid-but-closed-chat token get the
// same 404 on purpose, so this endpoint can't be used to probe which tokens
// exist.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!checkRateLimit(`visit-messages-get:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const { token } = await params;
  const visit = await getVisitByAccessToken(token);
  if (!visit || !isChatOpenForVisitor(visit)) {
    return NextResponse.json({ error: "Chat isn't available for this visit." }, { status: 404 });
  }

  const messages = await listMessagesCore(visit.id);
  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!checkRateLimit(`visit-messages-post:${token}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429 });
  }

  const visit = await getVisitByAccessToken(token);
  if (!visit || !isChatOpenForVisitor(visit)) {
    return NextResponse.json({ error: "Chat isn't available for this visit." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const validationError = validateMessageBody(text);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const message = await sendVisitorMessageCore(visit.id, text);
  return NextResponse.json({ message }, { status: 201 });
}
