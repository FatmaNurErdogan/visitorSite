// /visit/xxxxx — ziyaretçinin mail'deki linke tıklayınca telefonunda açtığı
// sayfa. Giriş yapması gerekmiyor, linkteki [token] onun kimliği gibi.
// Ziyaretin durumuna göre farklı şey gösterecek:
//   davet gönderildi (INVITED)    -> "Kabul Et" butonu
//   kabul etti (ACCEPTED)         -> "Giriş Yaptım" butonu + QR kod
//   içeri girdi (CHECKED_IN)      -> "Çıkış Yaptım" butonu
//   çıktı (CHECKED_OUT)           -> "Teşekkürler, görüşmek üzere" ekranı
// TODO: yukarıdaki durumlara göre içerik + gerçek buton işlevleri
export default function VisitTokenPage() {
  return (
    <main className="visit-token-page">
      <h1>Ziyaret</h1>
    </main>
  );
}
