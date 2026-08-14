import { NextResponse } from "next/server";
import {
  getVisitByAccessToken,
  isChatOpenForVisitor,
  listMessagesCore,
  sendVisitorMessageCore,
  validateMessageBody,
} from "@/actions/messages";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// Mobil (Flutter) uygulaması için ziyaretçi tarafı sohbet API'si.
// /api/visits/[token]/messages (web) ile aynı mantık, sadece mobil
// istemcinin sabit /api/mobile taban URL'ine uysun diye ayrı bir path'te.
// Kimlik doğrulama yok — link zaten kimlik yerine geçiyor.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!checkRateLimit(`mobile-visitor-messages-get:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen yavaşlayın." }, { status: 429 });
  }

  const { token } = await params;
  const visit = await getVisitByAccessToken(token);
  if (!visit || !isChatOpenForVisitor(visit)) {
    return NextResponse.json({ error: "Bu ziyaret için sohbet kullanılamıyor." }, { status: 404 });
  }

  const messages = await listMessagesCore(visit.id);
  return NextResponse.json({ messages, visitStatus: visit.status });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!checkRateLimit(`mobile-visitor-messages-post:${token}`, 20, 60_000)) {
    return NextResponse.json({ error: "Çok fazla mesaj. Lütfen yavaşlayın." }, { status: 429 });
  }

  const visit = await getVisitByAccessToken(token);
  if (!visit || !isChatOpenForVisitor(visit)) {
    return NextResponse.json({ error: "Bu ziyaret için sohbet kullanılamıyor." }, { status: 404 });
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
