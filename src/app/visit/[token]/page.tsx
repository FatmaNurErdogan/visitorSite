// /visit/xxxxx — ziyaretçinin telefonunda açtığı sayfa, kendi talebini
// buradan takip ediyor. Giriş yapması gerekmiyor, linkteki [token] onun kimliği.
// Ziyaretin durumuna göre farklı şey gösterecek:
//   onay bekliyor (PENDING)   -> "Onay bekleniyor" mesajı
//   onaylandı (ACCEPTED)      -> "Giriş Yaptım" butonu + QR kod
//   reddedildi (REJECTED)     -> "Talebiniz reddedildi" mesajı
//   içeri girdi (CHECKED_IN)  -> "Çıkış Yaptım" butonu
//   çıktı (CHECKED_OUT)       -> "Teşekkürler, görüşmek üzere" ekranı
// TODO: yukarıdaki durumlara göre içerik + gerçek buton işlevleri
export default function VisitTokenPage() {
  return (
    <main className="visit-token-page">
      <h1>Visit</h1>
    </main>
  );
}
