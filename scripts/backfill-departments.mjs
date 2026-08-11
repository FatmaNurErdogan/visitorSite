// app.Accounts + app.AccountDepartmentConnection (başka bir ekibin tabloları,
// SADECE OKUNUR) üzerinden, email eşleştirmesiyle vms_staff.department alanını
// dolduruyoruz. Sadece department alanı boş olan satırlar güncellenir; başka
// hiçbir alana (role, passwordHash vb.) dokunulmaz. Tekrar çalıştırmak güvenli.
// Çalıştırmak için: node scripts/backfill-departments.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT a.EMail AS email, c.DepartmentName AS department
    FROM app.Accounts a
    JOIN app.AccountDepartmentConnection c ON c.AccountId = a.Id
    WHERE a.IsDeleted = 0
  `);

  let updated = 0;

  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    const department = row.department?.trim();
    if (!email || !department) continue;

    const result = await prisma.staff.updateMany({
      where: { email, department: null },
      data: { department },
    });
    updated += result.count;
  }

  console.log(`Done. Set department on ${updated} staff account(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
