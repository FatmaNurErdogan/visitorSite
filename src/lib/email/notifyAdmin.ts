import { getResend } from "@/lib/email/resend";

// Personel bir ziyaret talebini onayladığında, o departmanın admin'ine
// (departmanın admin'i yoksa genel admin'e) giden "senin onayın bekleniyor" maili.
export async function sendAdminPendingApprovalNotification(
  adminEmail: string,
  visitorName: string,
  hostName: string,
  scheduledAt: Date,
  visitReason: string
) {
  const dashboardUrl = `${process.env.APP_BASE_URL}/staff/dashboard`;

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: adminEmail,
    subject: `Onay gerekiyor: ${visitorName}, ${hostName} adlı çalışanı ziyaret edecek`,
    html: `
      <p>${hostName}, ${visitorName} adlı ziyaretçinin ${scheduledAt.toLocaleString()} tarihli ziyaret talebini onayladı.</p>
      <p>Sebep: ${visitReason}</p>
      <p>Şimdi sizin son onayınızı bekliyor. Onaylamak veya reddetmek için <a href="${dashboardUrl}">panelinize</a> giriş yapın.</p>
    `,
  });
}
