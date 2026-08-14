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
    subject: isApproved ? "Ziyaret talebiniz onaylandı" : "Ziyaret talebiniz reddedildi",
    html: isApproved
      ? `
        <p>Merhaba ${visitorName},</p>
        <p>${hostName} adlı çalışanı ziyaret etme talebiniz <strong>onaylandı</strong>.</p>
        <p>Görüşmek üzere! Gelmeden önce <a href="${visitUrl}">${hostName} ile doğrudan mesajlaşabilirsiniz</a>.</p>
      `
      : `
        <p>Merhaba ${visitorName},</p>
        <p>${hostName} adlı çalışanı ziyaret etme talebiniz <strong>reddedildi</strong>.</p>
        ${reason ? `<p>Sebep: ${reason}</p>` : ""}
        <p>Farklı bir saat için yeni bir talep gönderebilirsiniz.</p>
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
    subject: "Ziyaret talebiniz planlanamadı",
    html: `
      <p>Merhaba ${visitorName},</p>
      <p>${hostName} adlı çalışanın ${scheduledAt.toLocaleString()} civarında zaten başka bir ziyareti planlanmış olduğu için o saat için talebinizi kabul edemedik.</p>
      <p>Lütfen farklı bir saat için yeni bir talep gönderin.</p>
    `,
  });
}
