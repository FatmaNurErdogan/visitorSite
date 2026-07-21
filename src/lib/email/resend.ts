// Mail göndermek için kullandığımız Resend'in bağlantısı burada kuruluyor.
// Başka bir dosyada mail göndermek istediğimizde bunu import edip
// resend.emails.send({ from, to, subject, html }) şeklinde kullanacağız.
import { Resend } from "resend";

let client: Resend | undefined;

// Lazy so importing this module doesn't crash when RESEND_API_KEY isn't set
// (e.g. during build, or local dev without email configured).
export function getResend() {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}
