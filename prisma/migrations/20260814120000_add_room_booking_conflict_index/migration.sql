BEGIN TRY

BEGIN TRAN;

-- CreateIndex
CREATE INDEX [vms_room_booking_roomId_status_startTime_endTime_idx] ON [dbo].[vms_room_booking]([roomId], [status], [startTime], [endTime]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
