import { getResend } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/escapeHtml";

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
    subject: isApproved ? "Ziyaret talebiniz onaylandı" : "Ziyaret talebiniz reddedildi",
    html: isApproved
      ? `
        <p>Merhaba ${escapeHtml(visitorName)},</p>
        <p>${escapeHtml(hostName)} adlı çalışanı ziyaret etme talebiniz <strong>onaylandı</strong>.</p>
        <p>Görüşmek üzere! Gelmeden önce <a href="${visitUrl}">${escapeHtml(hostName)} ile doğrudan mesajlaşabilirsiniz</a>.</p>
      `
      : `
        <p>Merhaba ${escapeHtml(visitorName)},</p>
        <p>${escapeHtml(hostName)} adlı çalışanı ziyaret etme talebiniz <strong>reddedildi</strong>.</p>
        ${reason ? `<p>Sebep: ${escapeHtml(reason)}</p>` : ""}
        <p>Farklı bir saat için yeni bir talep gönderebilirsiniz.</p>
      `,
  });
}
