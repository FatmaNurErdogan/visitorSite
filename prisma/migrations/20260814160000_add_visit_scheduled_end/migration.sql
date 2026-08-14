BEGIN TRY

BEGIN TRAN;

-- AlterTable: add nullable first so existing rows can be backfilled
ALTER TABLE [dbo].[vms_visit] ADD [scheduledEndAt] DATETIME2;

-- Backfill existing rows: assume the old fixed 1-hour visit duration.
-- Wrapped in EXEC(...) so this batch doesn't try to resolve the new
-- column name at compile time (SQL Server rejects same-batch references
-- to a column added by an ALTER TABLE earlier in that same batch).
EXEC(N'UPDATE [dbo].[vms_visit] SET [scheduledEndAt] = DATEADD(HOUR, 1, [scheduledAt]) WHERE [scheduledEndAt] IS NULL');

-- Now that every row has a value, make it required.
EXEC(N'ALTER TABLE [dbo].[vms_visit] ALTER COLUMN [scheduledEndAt] DATETIME2 NOT NULL');

-- CreateIndex
EXEC(N'CREATE INDEX [vms_visit_hostEmployeeId_status_scheduledAt_scheduledEndAt_idx] ON [dbo].[vms_visit]([hostEmployeeId], [status], [scheduledAt], [scheduledEndAt])');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
