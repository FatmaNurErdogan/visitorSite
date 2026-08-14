BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [tys].[vms_message] (
    [id] NVARCHAR(1000) NOT NULL,
    [visitId] NVARCHAR(1000) NOT NULL,
    [senderType] NVARCHAR(1000) NOT NULL,
    [senderStaffId] NVARCHAR(1000),
    [body] NVARCHAR(2000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [vms_message_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [vms_message_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [tys].[vms_message] ADD CONSTRAINT [vms_message_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [tys].[vms_visit]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [tys].[vms_message] ADD CONSTRAINT [vms_message_senderStaffId_fkey] FOREIGN KEY ([senderStaffId]) REFERENCES [tys].[vms_staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
