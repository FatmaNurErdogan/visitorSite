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
    subject: `Approval needed: ${visitorName}'s visit to ${hostName}`,
    html: `
      <p>${hostName} approved a visit request from ${visitorName} on ${scheduledAt.toLocaleString()}.</p>
      <p>Reason: ${visitReason}</p>
      <p>It's now waiting on your final approval. Log in to <a href="${dashboardUrl}">your dashboard</a> to approve or reject it.</p>
    `,
  });
}
