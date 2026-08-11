// "Personellerim" uygulamasının verisini VMS'e aktarır.
// Kaynak: aynı paylaşımlı DB'deki app.Accounts tablosu (başka bir ekibin tablosu) —
// SADECE OKUNUR, hiçbir satırı değiştirmez veya silmez.
// Hedef: bizim vms_staff tablomuz — sadece email'i vms_staff'ta OLMAYAN kişiler
// eklenir (idempotent, tekrar çalıştırmak güvenli, var olan hesapları değiştirmez).
//
// app.Accounts'taki PasswordHash kopyalanmıyor (farklı bir sistemin hash formatı,
// VMS'in kendi login akışında işe yaramaz). Bunun yerine rastgele, kullanılamaz
// bir placeholder hash konuyor — bu kişiler VMS'e host olarak seçilebilir ama
// admin onlara gerçek bir şifre atayana kadar giriş yapamazlar.
//
// Çalıştırmak için: node scripts/import-staff-from-accounts.mjs
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.$queryRawUnsafe(
    `SELECT FullName, EMail, IsAdmin FROM app.Accounts WHERE IsDeleted = 0`
  );

  let added = 0;
  let skipped = 0;

  for (const account of accounts) {
    const email = account.EMail?.trim().toLowerCase();
    const name = account.FullName?.trim();
    if (!email || !name) {
      skipped++;
      continue;
    }

    const existing = await prisma.staff.findUnique({ where: { email } });
    if (existing) {
      skipped++;
      continue;
    }

    const placeholderPassword = randomUUID();
    const passwordHash = await bcrypt.hash(placeholderPassword, 10);

    await prisma.staff.create({
      data: {
        name,
        email,
        passwordHash,
        role: account.IsAdmin ? "ADMIN" : "EMPLOYEE",
      },
    });
    added++;
  }

  console.log(`Done. Added ${added} staff account(s), skipped ${skipped} (already existed or missing name/email).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
