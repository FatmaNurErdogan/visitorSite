// Paylaşımlı DB'de sadece kendi tablomuzu (vms_staff) hedefleyen, tekrar
// çalıştırılabilir (idempotent) ALTER TABLE — prisma migrate/db push yerine.
// Çalıştırmak için: node scripts/add-department-column.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.vms_staff') AND name = 'department'
    )
    BEGIN
      ALTER TABLE [dbo].[vms_staff] ADD [department] NVARCHAR(1000) NULL;
    END
  `);

  console.log("vms_staff.department column is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
