BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [tys].[vms_meeting_room] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [location] NVARCHAR(1000),
    [capacity] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [vms_meeting_room_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [vms_meeting_room_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [vms_meeting_room_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [tys].[vms_room_booking] (
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

-- AddForeignKey
ALTER TABLE [tys].[vms_room_booking] ADD CONSTRAINT [vms_room_booking_roomId_fkey] FOREIGN KEY ([roomId]) REFERENCES [tys].[vms_meeting_room]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [tys].[vms_room_booking] ADD CONSTRAINT [vms_room_booking_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [tys].[vms_visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [tys].[vms_room_booking] ADD CONSTRAINT [vms_room_booking_requestedById_fkey] FOREIGN KEY ([requestedById]) REFERENCES [tys].[vms_staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [tys].[vms_room_booking] ADD CONSTRAINT [vms_room_booking_approvedById_fkey] FOREIGN KEY ([approvedById]) REFERENCES [tys].[vms_staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
