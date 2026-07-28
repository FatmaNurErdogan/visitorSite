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

// Sent to the host when reception confirms the visitor has physically
// arrived and been let into the building.
export async function sendVisitorArrivedNotification(hostEmail: string, visitorName: string) {
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: hostEmail,
    subject: `${visitorName} has arrived`,
    html: `
      <p>${visitorName} has checked in at reception and is on their way to you.</p>
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
      <p>${visitorName} has checked out at reception and left the building.</p>
    `,
  });
}
