// Mail göndermek için kullandığımız Resend'in bağlantısı burada kuruluyor.
// Başka bir dosyada mail göndermek istediğimizde bunu import edip
// resend.emails.send({ from, to, subject, html }) şeklinde kullanacağız.
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
