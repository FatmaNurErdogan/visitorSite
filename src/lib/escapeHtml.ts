// Ziyaretçi/personel tarafından girilen serbest metin (isim, ziyaret nedeni,
// red gerekçesi vb.) e-posta HTML gövdesine doğrudan interpolate ediliyor —
// bu, bir ziyaretçinin adına "<a href=...>" gibi bir payload girip host'un
// mail istemcisinde tıklanabilir/gizlenmiş bir link enjekte etmesine izin
// verir. Kullanıcıdan gelen her değer e-posta HTML'ine konmadan önce bundan
// geçmeli.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
