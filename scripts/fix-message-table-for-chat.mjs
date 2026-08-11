// `vms_message` var olan haliyle eski (artık kullanılmayan) personel-mesajlaşma
// özelliğine ait kolonları taşıyordu (senderId/receiverId/readAt). Takım arkadaşı
// aynı tabloyu ziyaretçi-host sohbeti için farklı bir şemayla (visitId/senderType/
// senderStaffId) prisma/schema.prisma'ya ekledi — fiziksel tablo hiç güncellenmedi,
// bu yüzden sohbet her istekte "column does not exist" hatasıyla 500 veriyordu.
//
// Eski tabloda tek bir test satırı vardı (terk edilmiş özellikten kalma), gerçek
// veri yok — bu yüzden tabloyu güvenle silip doğru şemayla yeniden oluşturuyoruz.
// Çalıştırmak için: node scripts/fix-message-table-for-chat.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    IF OBJECT_ID('dbo.vms_message', 'U') IS NOT NULL DROP TABLE dbo.vms_message;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE [dbo].[vms_message] (
      [id] NVARCHAR(1000) NOT NULL,
      [visitId] NVARCHAR(1000) NOT NULL,
      [senderType] NVARCHAR(1000) NOT NULL,
      [senderStaffId] NVARCHAR(1000),
      [body] NVARCHAR(2000) NOT NULL,
      [createdAt] DATETIME2 NOT NULL CONSTRAINT [vms_message_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT [vms_message_pkey] PRIMARY KEY CLUSTERED ([id])
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE [dbo].[vms_message] ADD CONSTRAINT [vms_message_visitId_fkey]
      FOREIGN KEY ([visitId]) REFERENCES [dbo].[vms_visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE [dbo].[vms_message] ADD CONSTRAINT [vms_message_senderStaffId_fkey]
      FOREIGN KEY ([senderStaffId]) REFERENCES [dbo].[vms_staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
  `);

  console.log("vms_message table recreated with the visit-chat schema.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
