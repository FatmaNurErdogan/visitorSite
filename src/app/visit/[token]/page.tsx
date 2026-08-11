// /visit/[token] — the visitor's page for a single visit. No login: the
// accessToken generated at request time is the credential.
import { getVisitByAccessToken, isChatOpen } from "@/actions/messages";
import { ChatBox } from "@/components/ChatBox";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function VisitorVisitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const visit = await getVisitByAccessToken(token);

  if (!visit) {
    return (
      <main className="page-container">
        <h1>Visit not found</h1>
        <p>This link isn&apos;t valid. Double check the link from your email.</p>
      </main>
    );
  }

  return (
    <main className="page-container">
      <h1>Your visit</h1>
      <p>
        Visiting <strong>{visit.hostEmployee.name}</strong> &mdash; <StatusBadge status={visit.status} />
      </p>
      <p>Scheduled for {visit.scheduledAt.toLocaleString()}</p>

      {isChatOpen(visit.status) ? (
        <section>
          <h2>Chat with {visit.hostEmployee.name}</h2>
          <ChatBox apiUrl={`/api/visits/${token}/messages`} viewerType="VISITOR" />
        </section>
      ) : (
        <p>Chat isn&apos;t available for this visit.</p>
      )}
    </main>
  );
}
