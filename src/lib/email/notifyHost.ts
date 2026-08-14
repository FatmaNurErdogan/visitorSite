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
    subject: `${visitorName} tarafından yeni bir ziyaret talebi`,
    html: `
      <p>${visitorName}, sizi ${scheduledAt.toLocaleString()} tarihinde ziyaret etmek istiyor.</p>
      <p>Sebep: ${visitReason}</p>
      <p>Bu talebi onaylamak veya reddetmek için <a href="${dashboardUrl}">panelinize</a> giriş yapın.</p>
    `,
  });
}

// Sent to the host when reception confirms the visitor has physically
// arrived and been let into the building.
export async function sendVisitorArrivedNotification(hostEmail: string, visitorName: string) {
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: hostEmail,
    subject: `${visitorName} geldi`,
    html: `
      <p>${visitorName} resepsiyonda giriş yaptı ve size doğru geliyor.</p>
    `,
  });
}

// Sent to the host when reception confirms the visitor has left the
// building.
export async function sendVisitorDepartedNotification(hostEmail: string, visitorName: string) {
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: hostEmail,
    subject: `${visitorName} ayrıldı`,
    html: `
      <p>${visitorName} resepsiyonda çıkış yaptı ve binadan ayrıldı.</p>
    `,
  });
}

// Departman admin'i son kararını verince (personel zaten onaylamıştı) host'a
// giden bilgi maili — kabul edildiyse veya reddedildiyse (gerekçesiyle).
export async function sendHostFinalDecisionNotification(
  hostEmail: string,
  hostName: string,
  visitorName: string,
  decision: "ACCEPTED" | "REJECTED",
  reason?: string
) {
  const isApproved = decision === "ACCEPTED";

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: hostEmail,
    subject: isApproved ? `${visitorName} adlı ziyaretçinin ziyareti onaylandı` : `${visitorName} adlı ziyaretçinin ziyareti reddedildi`,
    html: isApproved
      ? `
        <p>Merhaba ${hostName},</p>
        <p>Onayladığınız ${visitorName} ziyaret talebi, departman yöneticisi tarafından da <strong>son olarak onaylandı</strong>. Ziyaretçiye bilgi verildi.</p>
      `
      : `
        <p>Merhaba ${hostName},</p>
        <p>Onayladığınız ${visitorName} ziyaret talebi, departman yöneticisi tarafından <strong>reddedildi</strong>.</p>
        ${reason ? `<p>Sebep: ${reason}</p>` : ""}
      `,
  });
}
