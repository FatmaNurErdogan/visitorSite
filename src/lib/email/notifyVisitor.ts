import { getResend } from "@/lib/email/resend";

// Çalışan onayla/reddet dediğinde ziyaretçiye "talebiniz onaylandı/reddedildi"
// diye giden mail. sendHostRequestNotification'ın ziyaretçi tarafındaki karşılığı.
export async function sendVisitorDecisionNotification(
  visitorEmail: string,
  visitorName: string,
  hostName: string,
  decision: "ACCEPTED" | "REJECTED",
  accessToken: string,
  reason?: string
) {
  const isApproved = decision === "ACCEPTED";
  const visitUrl = `${process.env.APP_BASE_URL}/visit/${accessToken}`;

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: visitorEmail,
    subject: isApproved ? "Your visit request was approved" : "Your visit request was declined",
    html: isApproved
      ? `
        <p>Hi ${visitorName},</p>
        <p>Your request to visit ${hostName} has been <strong>approved</strong>.</p>
        <p>See you soon! You can also <a href="${visitUrl}">message ${hostName} directly</a> before you arrive.</p>
      `
      : `
        <p>Hi ${visitorName},</p>
        <p>Your request to visit ${hostName} has been <strong>declined</strong>.</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ""}
        <p>Feel free to submit a new request for a different time.</p>
      `,
  });
}

// Host'un o saatte zaten kabul edilmiş başka bir ziyareti olduğu için talebin
// otomatik reddedildiği durumda gönderilir — sendVisitorDecisionNotification'ın
// genel red mailinden farklı olarak ziyaretçiyi açıkça farklı bir saat
// denemeye yönlendirir.
export async function sendVisitorScheduleConflictNotification(
  visitorEmail: string,
  visitorName: string,
  hostName: string,
  scheduledAt: Date
) {
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: visitorEmail,
    subject: "Your visit request couldn't be scheduled",
    html: `
      <p>Hi ${visitorName},</p>
      <p>${hostName} already has another visit scheduled around ${scheduledAt.toLocaleString()}, so we couldn't accept your request for that time.</p>
      <p>Please submit a new request for a different time.</p>
    `,
  });
}
