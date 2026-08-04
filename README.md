# Visitor Management System

Ziyaretçi yönetim sistemi. Ziyaretçi giriş yapmadan bir ziyaret talebi oluşturur,
ziyaret edeceği çalışana mail gider, çalışan giriş yapıp onaylar/reddeder, resepsiyonist de
onaylanan ziyaretçiyi fiziksel olarak içeri alır/çıkarır.

## Kurulum

1. Bağımlılıkları kur:
   ```bash
   npm install
   ```

2. Proje kökünde bir `.env` dosyası oluştur (bu dosya git'e gitmiyor, kendi bilgisayarında kalıyor)
   ve şu değişkenleri doldur:

   ```
   DATABASE_URL="sqlserver://SUNUCU:PORT;database=VERITABANI_ADI;user=KULLANICI;password=SIFRE;trustServerCertificate=true"
   AUTH_SECRET="rastgele-uzun-bir-metin"
   RESEND_API_KEY="resend.com'dan alacağın API key"
   RESEND_FROM_EMAIL="onboarding@resend.dev"
   APP_BASE_URL="http://localhost:3000"
   ```

   - `DATABASE_URL`: hangi SQL Server veritabanına bağlanacağını buradan sor
     (yerel kurulumun için `sqlserver://localhost:1433;database=visitor_site;user=...;password=...;trustServerCertificate=true` formatı)
   - `AUTH_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` ile üretebilirsin
   - `RESEND_API_KEY`: [resend.com](https://resend.com) üzerinden ücretsiz hesap açıp alabilirsin

3. Veritabanı bağlantısını kur (Prisma client'ı oluşturur):
   ```bash
   npx prisma generate
   ```

   **Not:** Eğer paylaşımlı bir veritabanına (örn. şirketin ortak staj veritabanı) bağlanıyorsan,
   `npx prisma migrate` veya `npx prisma db push` **çalıştırma** — bu komutlar veritabanındaki
   başka tabloları silmeyi önerebilir. Tablo yapısı zaten kurulu, sadece `prisma generate` yeterli.

4. Geliştirme sunucusunu başlat:
   ```bash
   npm run dev
   ```

   [http://localhost:3000](http://localhost:3000) adresinde açılır.

## Proje yapısı

- `src/app/` — sayfalar (Next.js App Router)
- `src/actions/` — form gönderiminde çalışan sunucu fonksiyonları (server actions)
- `src/components/` — paylaşılan arayüz bileşenleri
- `src/lib/` — veritabanı bağlantısı, e-posta gönderimi gibi yardımcı kodlar
- `prisma/schema.prisma` — veritabanı tabloları
