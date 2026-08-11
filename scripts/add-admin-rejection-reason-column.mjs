// Paylaşımlı DB'de sadece kendi tablomuzu (vms_visit) hedefleyen, tekrar
// çalıştırılabilir (idempotent) ALTER TABLE — prisma migrate/db push yerine.
// Çalıştırmak için: node scripts/add-admin-rejection-reason-column.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.vms_visit') AND name = 'adminRejectionReason'
    )
    BEGIN
      ALTER TABLE [dbo].[vms_visit] ADD [adminRejectionReason] NVARCHAR(1000) NULL;
    END
  `);

  console.log("vms_visit.adminRejectionReason column is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
