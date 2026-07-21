BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Staff] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [Staff_role_df] DEFAULT 'EMPLOYEE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Staff_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Staff_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Staff_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Visitor] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [company] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Visitor_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Visitor_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Visit] (
    [id] NVARCHAR(1000) NOT NULL,
    [visitorId] NVARCHAR(1000) NOT NULL,
    [hostEmployeeId] NVARCHAR(1000) NOT NULL,
    [visitReason] NVARCHAR(1000) NOT NULL,
    [scheduledAt] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Visit_status_df] DEFAULT 'PENDING',
    [accessToken] NVARCHAR(1000) NOT NULL,
    [tokenExpiresAt] DATETIME2 NOT NULL,
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [Visit_requestedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [respondedAt] DATETIME2,
    [checkedInAt] DATETIME2,
    [checkedOutAt] DATETIME2,
    CONSTRAINT [Visit_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Visit_accessToken_key] UNIQUE NONCLUSTERED ([accessToken])
);

-- AddForeignKey
ALTER TABLE [dbo].[Visit] ADD CONSTRAINT [Visit_visitorId_fkey] FOREIGN KEY ([visitorId]) REFERENCES [dbo].[Visitor]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Visit] ADD CONSTRAINT [Visit_hostEmployeeId_fkey] FOREIGN KEY ([hostEmployeeId]) REFERENCES [dbo].[Staff]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
