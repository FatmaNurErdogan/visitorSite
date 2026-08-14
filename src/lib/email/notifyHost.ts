import { getResend } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/escapeHtml";

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
      <p>${escapeHtml(visitorName)} has requested to visit you on ${scheduledAt.toLocaleString()}.</p>
      <p>Reason: ${escapeHtml(visitReason)}</p>
      <p>Log in to <a href="${dashboardUrl}">your dashboard</a> to approve or reject this request.</p>
    `,
  });
}

// Sent to the host when reception confirms the visitor has physically
// arrived and been let into the building.
export async function sendVisitorArrivedNotification(hostEmail: string, visitorName: string) {
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: hostEmail,
    subject: `${visitorName} has arrived`,
    html: `
      <p>${escapeHtml(visitorName)} has checked in at reception and is on their way to you.</p>
    `,
  });
}

// Sent to the host when reception confirms the visitor has left the
// building.
export async function sendVisitorDepartedNotification(hostEmail: string, visitorName: string) {
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: hostEmail,
    subject: `${visitorName} has left`,
    html: `
      <p>${escapeHtml(visitorName)} has checked out at reception and left the building.</p>
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
    subject: isApproved ? `${visitorName}'s visit was approved` : `${visitorName}'s visit was rejected`,
    html: isApproved
      ? `
        <p>Hi ${escapeHtml(hostName)},</p>
        <p>The visit request from ${escapeHtml(visitorName)} that you approved has now been <strong>finally approved</strong> by the department admin. The visitor has been notified.</p>
      `
      : `
        <p>Hi ${escapeHtml(hostName)},</p>
        <p>The visit request from ${escapeHtml(visitorName)} that you approved was <strong>rejected</strong> by the department admin.</p>
        ${reason ? `<p>Reason: ${escapeHtml(reason)}</p>` : ""}
      `,
  });
}
