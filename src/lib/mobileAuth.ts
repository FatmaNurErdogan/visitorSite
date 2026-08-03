// Flutter uygulaması için token tabanlı auth. NextAuth'un cookie/session
// akışından bağımsız: login'de bir JWT üretiyoruz, mobil istemci bunu
// saklayıp her istekte "Authorization: Bearer <token>" olarak gönderiyor.
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export type MobileTokenPayload = {
  sub: string;
  role: string;
  name: string;
  email: string;
};

export async function signMobileToken(payload: MobileTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function getMobileUser(req: Request): Promise<MobileTokenPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const { payload } = await jwtVerify(authHeader.slice(7), secret);
    return payload as unknown as MobileTokenPayload;
  } catch {
    return null;
  }
}
