import { getResend } from "@/lib/email/resend";

// Çalışan onayla/reddet dediğinde ziyaretçiye "talebiniz onaylandı/reddedildi"
// diye giden mail. sendHostRequestNotification'ın ziyaretçi tarafındaki karşılığı.
export async function sendVisitorDecisionNotification(
  visitorEmail: string,
  visitorName: string,
  hostName: string,
  decision: "ACCEPTED" | "REJECTED"
) {
  const isApproved = decision === "ACCEPTED";

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: visitorEmail,
    subject: isApproved ? "Your visit request was approved" : "Your visit request was declined",
    html: isApproved
      ? `
        <p>Hi ${visitorName},</p>
        <p>Your request to visit ${hostName} has been <strong>approved</strong>.</p>
        <p>See you soon!</p>
      `
      : `
        <p>Hi ${visitorName},</p>
        <p>Your request to visit ${hostName} has been <strong>declined</strong>.</p>
      `,
  });
}
