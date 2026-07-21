import { getResend } from "@/lib/email/resend";

export async function sendHostRequestNotification(
  hostEmail: string,
  visitorName: string,
  visitReason: string,
  scheduledAt: Date
) {
  const dashboardUrl = `${process.env.APP_BASE_URL}/staff/dashboard`;

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: hostEmail,
    subject: `New visit request from ${visitorName}`,
    html: `
      <p>${visitorName} has requested to visit you on ${scheduledAt.toLocaleString()}.</p>
      <p>Reason: ${visitReason}</p>
      <p>Log in to <a href="${dashboardUrl}">your dashboard</a> to approve or reject this request.</p>
    `,
  });
}
