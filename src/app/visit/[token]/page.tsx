// /visit/[token] — the visitor's page for a single visit. No login: the
// accessToken generated at request time is the credential.
import { getVisitByAccessToken, isChatOpenForVisitor } from "@/actions/messages";
import { ChatBox } from "@/components/ChatBox";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function VisitorVisitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const visit = await getVisitByAccessToken(token);

  if (!visit) {
    return (
      <main className="page-container">
        <h1>Ziyaret bulunamadı</h1>
        <p>Bu bağlantı geçerli değil. E-postanızdaki bağlantıyı tekrar kontrol edin.</p>
      </main>
    );
  }

  return (
    <main className="page-container">
      <h1>Ziyaretiniz</h1>
      <p>
        <strong>{visit.hostEmployee.name}</strong> adlı çalışanı ziyaret ediyorsunuz &mdash; <StatusBadge status={visit.status} />
      </p>
      <p>{visit.scheduledAt.toLocaleString()} tarihine planlandı</p>

      {isChatOpenForVisitor(visit) ? (
        <section>
          <h2>{visit.hostEmployee.name} ile sohbet</h2>
          <ChatBox apiUrl={`/api/visits/${token}/messages`} viewerType="VISITOR" />
        </section>
      ) : (
        <p>Bu ziyaret için sohbet kullanılamıyor.</p>
      )}
    </main>
  );
}
