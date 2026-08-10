import { NextResponse } from "next/server";
import { getVisitByAccessToken, isChatOpen, listMessagesCore, sendVisitorMessageCore } from "@/actions/messages";

// Mobil (Flutter) uygulaması için ziyaretçi tarafı sohbet API'si.
// /api/visits/[token]/messages (web) ile aynı mantık, sadece mobil
// istemcinin sabit /api/mobile taban URL'ine uysun diye ayrı bir path'te.
// Kimlik doğrulama yok — link zaten kimlik yerine geçiyor.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const visit = await getVisitByAccessToken(token);
  if (!visit || !isChatOpen(visit.status)) {
    return NextResponse.json({ error: "Chat isn't available for this visit." }, { status: 404 });
  }

  const messages = await listMessagesCore(visit.id);
  return NextResponse.json({ messages, visitStatus: visit.status });
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
