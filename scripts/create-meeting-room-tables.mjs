// vms_meeting_room ve vms_room_booking paylaşımlı DB'de (UZSER_STAJYER) hiç
// yoktu (onat'ın migration'ı sadece kendi local DB'sinde çalıştırılmış) —
// /staff/rooms sayfası bu yüzden her zaman hata veriyordu. Sadece kendi
// tablolarımızı hedefleyen, tekrar çalıştırılabilir (idempotent) ham SQL ile
// oluşturuyoruz — diğer takımların tablolarına dokunmuyoruz.
// Çalıştırmak için: node scripts/create-meeting-room-tables.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vms_meeting_room')
    BEGIN
      CREATE TABLE [dbo].[vms_meeting_room] (
        [id] NVARCHAR(1000) NOT NULL,
        [name] NVARCHAR(1000) NOT NULL,
        [location] NVARCHAR(1000),
        [capacity] INT,
        [perks] NVARCHAR(500),
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [vms_meeting_room_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [vms_meeting_room_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [vms_meeting_room_name_key] UNIQUE NONCLUSTERED ([name])
      );
    END
  `);

  await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vms_room_booking')
    BEGIN
      CREATE TABLE [dbo].[vms_room_booking] (
        [id] NVARCHAR(1000) NOT NULL,
        [roomId] NVARCHAR(1000) NOT NULL,
        [visitId] NVARCHAR(1000),
        [requestedById] NVARCHAR(1000) NOT NULL,
        [approvedById] NVARCHAR(1000),
        [purpose] NVARCHAR(500) NOT NULL,
        [startTime] DATETIME2 NOT NULL,
        [endTime] DATETIME2 NOT NULL,
        [status] NVARCHAR(1000) NOT NULL CONSTRAINT [vms_room_booking_status_df] DEFAULT 'PENDING',
        [requestedAt] DATETIME2 NOT NULL CONSTRAINT [vms_room_booking_requestedAt_df] DEFAULT CURRENT_TIMESTAMP,
        [respondedAt] DATETIME2,
        CONSTRAINT [vms_room_booking_pkey] PRIMARY KEY CLUSTERED ([id])
      );

      ALTER TABLE [dbo].[vms_room_booking] ADD CONSTRAINT [vms_room_booking_roomId_fkey]
        FOREIGN KEY ([roomId]) REFERENCES [dbo].[vms_meeting_room]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

      ALTER TABLE [dbo].[vms_room_booking] ADD CONSTRAINT [vms_room_booking_visitId_fkey]
        FOREIGN KEY ([visitId]) REFERENCES [dbo].[vms_visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

      ALTER TABLE [dbo].[vms_room_booking] ADD CONSTRAINT [vms_room_booking_requestedById_fkey]
        FOREIGN KEY ([requestedById]) REFERENCES [dbo].[vms_staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

      ALTER TABLE [dbo].[vms_room_booking] ADD CONSTRAINT [vms_room_booking_approvedById_fkey]
        FOREIGN KEY ([approvedById]) REFERENCES [dbo].[vms_staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
    END
  `);

  console.log("vms_meeting_room / vms_room_booking tables are ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
