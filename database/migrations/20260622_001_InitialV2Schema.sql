IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [Categories] (
        [CategoryId] int NOT NULL IDENTITY,
        [Code] nvarchar(32) NOT NULL,
        [Label] nvarchar(64) NOT NULL,
        [IconKey] nvarchar(64) NOT NULL,
        [SortOrder] int NOT NULL,
        [IsSystemDefined] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Categories] PRIMARY KEY ([CategoryId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [ReminderSettings] (
        [ReminderSettingId] int NOT NULL IDENTITY,
        [Category] int NOT NULL,
        [CadenceDays] int NOT NULL,
        [TemplateBody] nvarchar(max) NOT NULL,
        [IsEnabled] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ReminderSettings] PRIMARY KEY ([ReminderSettingId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [Users] (
        [UserId] uniqueidentifier NOT NULL,
        [DisplayName] nvarchar(256) NOT NULL,
        [Email] nvarchar(320) NOT NULL,
        [Department] nvarchar(128) NULL,
        [FirstSignInAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([UserId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [Vendors] (
        [VendorId] int NOT NULL IDENTITY,
        [VendorCode] nvarchar(32) NULL,
        [Name] nvarchar(256) NOT NULL,
        [Type] int NOT NULL,
        [PreferredStatus] int NOT NULL,
        [PrimaryContactName] nvarchar(256) NULL,
        [PrimaryContactEmail] nvarchar(320) NULL,
        [PrimaryContactPhone] nvarchar(64) NULL,
        [PrimaryContactRole] nvarchar(128) NULL,
        [Location] nvarchar(256) NULL,
        [VendorSinceText] nvarchar(32) NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Vendors] PRIMARY KEY ([VendorId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [CategoryFields] (
        [CategoryFieldId] int NOT NULL IDENTITY,
        [CategoryId] int NOT NULL,
        [FieldKey] nvarchar(64) NOT NULL,
        [Label] nvarchar(128) NOT NULL,
        [Type] int NOT NULL,
        [HelperText] nvarchar(512) NULL,
        [OptionsJson] nvarchar(max) NULL,
        [IsRequired] bit NOT NULL,
        [SortOrder] int NOT NULL,
        [IsSystemDefined] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_CategoryFields] PRIMARY KEY ([CategoryFieldId]),
        CONSTRAINT [FK_CategoryFields_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([CategoryId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [Contracts] (
        [ContractId] int NOT NULL IDENTITY,
        [ContractNumber] nvarchar(24) NOT NULL,
        [Title] nvarchar(256) NOT NULL,
        [Category] int NOT NULL,
        [OverallStatus] int NOT NULL,
        [Priority] int NOT NULL,
        [VendorId] int NOT NULL,
        [RequesterUserId] uniqueidentifier NOT NULL,
        [RequesterEmail] nvarchar(320) NOT NULL,
        [ProcurementOwnerUserId] uniqueidentifier NULL,
        [TotalCostUsd] decimal(18,2) NULL,
        [SubmittedAt] datetime2 NOT NULL,
        [TermStartDate] datetime2 NULL,
        [TermEndDate] datetime2 NULL,
        [LastActionAt] datetime2 NOT NULL,
        [Description] nvarchar(max) NULL,
        [EventName] nvarchar(256) NULL,
        [EventDate] datetime2 NULL,
        [VenueLocation] nvarchar(256) NULL,
        [ParentEventName] nvarchar(256) NULL,
        [Building] nvarchar(256) NULL,
        [ServiceDescription] nvarchar(max) NULL,
        [ITType] int NULL,
        [ApplicationName] nvarchar(256) NULL,
        [ApplicationVersion] nvarchar(128) NULL,
        [LicensingType] int NULL,
        [NumberOfUsers] int NULL,
        [CloudOrOnPrem] int NULL,
        [SystemAccess] nvarchar(max) NULL,
        [Permissions] nvarchar(max) NULL,
        [Integrations] nvarchar(max) NULL,
        [AccessesPersonalData] bit NULL,
        [AccessesPHI] bit NULL,
        [UsesAI] bit NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Contracts] PRIMARY KEY ([ContractId]),
        CONSTRAINT [FK_Contracts_Users_ProcurementOwnerUserId] FOREIGN KEY ([ProcurementOwnerUserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Contracts_Users_RequesterUserId] FOREIGN KEY ([RequesterUserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Contracts_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([VendorId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [ActivityEvents] (
        [ActivityEventId] bigint NOT NULL IDENTITY,
        [ContractId] int NOT NULL,
        [ActorUserId] uniqueidentifier NOT NULL,
        [Type] int NOT NULL,
        [DescriptionLine] nvarchar(512) NOT NULL,
        [StructuredJson] nvarchar(max) NULL,
        [OccurredAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ActivityEvents] PRIMARY KEY ([ActivityEventId]),
        CONSTRAINT [FK_ActivityEvents_Contracts_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [Contracts] ([ContractId]) ON DELETE CASCADE,
        CONSTRAINT [FK_ActivityEvents_Users_ActorUserId] FOREIGN KEY ([ActorUserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [ContractAssignments] (
        [ContractAssignmentId] int NOT NULL IDENTITY,
        [ContractId] int NOT NULL,
        [ReviewerUserId] uniqueidentifier NOT NULL,
        [ReviewerTeam] int NOT NULL,
        [AssignedAt] datetime2 NOT NULL,
        [AssignedByUserId] uniqueidentifier NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ContractAssignments] PRIMARY KEY ([ContractAssignmentId]),
        CONSTRAINT [FK_ContractAssignments_Contracts_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [Contracts] ([ContractId]) ON DELETE CASCADE,
        CONSTRAINT [FK_ContractAssignments_Users_ReviewerUserId] FOREIGN KEY ([ReviewerUserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [ContractAttachmentBatches] (
        [BatchId] int NOT NULL IDENTITY,
        [ContractId] int NOT NULL,
        [TotalAttachments] int NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ContractAttachmentBatches] PRIMARY KEY ([BatchId]),
        CONSTRAINT [FK_ContractAttachmentBatches_Contracts_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [Contracts] ([ContractId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [ContractComments] (
        [ContractCommentId] int NOT NULL IDENTITY,
        [ContractId] int NOT NULL,
        [AuthorUserId] uniqueidentifier NOT NULL,
        [AuthorRoleSnapshot] nvarchar(64) NOT NULL,
        [Text] nvarchar(max) NOT NULL,
        [IsInternalOnly] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ContractComments] PRIMARY KEY ([ContractCommentId]),
        CONSTRAINT [FK_ContractComments_Contracts_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [Contracts] ([ContractId]) ON DELETE CASCADE,
        CONSTRAINT [FK_ContractComments_Users_AuthorUserId] FOREIGN KEY ([AuthorUserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [ContractFieldValues] (
        [ContractFieldValueId] int NOT NULL IDENTITY,
        [ContractId] int NOT NULL,
        [CategoryFieldId] int NOT NULL,
        [FieldKey] nvarchar(64) NOT NULL,
        [ValueText] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ContractFieldValues] PRIMARY KEY ([ContractFieldValueId]),
        CONSTRAINT [FK_ContractFieldValues_CategoryFields_CategoryFieldId] FOREIGN KEY ([CategoryFieldId]) REFERENCES [CategoryFields] ([CategoryFieldId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ContractFieldValues_Contracts_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [Contracts] ([ContractId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [ContractLanes] (
        [ContractLaneId] int NOT NULL IDENTITY,
        [ContractId] int NOT NULL,
        [LaneId] int NOT NULL,
        [Status] int NOT NULL,
        [OwnerUserId] uniqueidentifier NULL,
        [OwnerLabel] nvarchar(256) NULL,
        [DueDate] datetime2 NULL,
        [LastUpdated] datetime2 NOT NULL,
        [Note] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ContractLanes] PRIMARY KEY ([ContractLaneId]),
        CONSTRAINT [FK_ContractLanes_Contracts_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [Contracts] ([ContractId]) ON DELETE CASCADE,
        CONSTRAINT [FK_ContractLanes_Users_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [ContractNotes] (
        [ContractNoteId] int NOT NULL IDENTITY,
        [ContractId] int NOT NULL,
        [AuthorUserId] uniqueidentifier NOT NULL,
        [Type] int NOT NULL,
        [NoteDate] datetime2 NOT NULL,
        [Participants] nvarchar(512) NULL,
        [Text] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ContractNotes] PRIMARY KEY ([ContractNoteId]),
        CONSTRAINT [FK_ContractNotes_Contracts_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [Contracts] ([ContractId]) ON DELETE CASCADE,
        CONSTRAINT [FK_ContractNotes_Users_AuthorUserId] FOREIGN KEY ([AuthorUserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [NotificationLogs] (
        [NotificationLogId] bigint NOT NULL IDENTITY,
        [ContractId] int NOT NULL,
        [TargetLaneId] int NOT NULL,
        [Channel] int NOT NULL,
        [RecipientLabel] nvarchar(512) NULL,
        [RecipientEmail] nvarchar(320) NULL,
        [Subject] nvarchar(256) NOT NULL,
        [Status] int NOT NULL,
        [FailureReason] nvarchar(512) NULL,
        [SentAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_NotificationLogs] PRIMARY KEY ([NotificationLogId]),
        CONSTRAINT [FK_NotificationLogs_Contracts_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [Contracts] ([ContractId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE TABLE [ContractAttachments] (
        [ContractAttachmentId] int NOT NULL IDENTITY,
        [AttachmentGuid] uniqueidentifier NOT NULL,
        [ContractId] int NOT NULL,
        [BatchId] int NULL,
        [BlobPath] nvarchar(512) NOT NULL,
        [FileName] nvarchar(256) NOT NULL,
        [ContentType] nvarchar(128) NOT NULL,
        [SizeBytes] bigint NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAt] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [CreatedBy] nvarchar(256) NOT NULL,
        [UpdatedBy] nvarchar(256) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ContractAttachments] PRIMARY KEY ([ContractAttachmentId]),
        CONSTRAINT [FK_ContractAttachments_ContractAttachmentBatches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [ContractAttachmentBatches] ([BatchId]) ON DELETE SET NULL,
        CONSTRAINT [FK_ContractAttachments_Contracts_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [Contracts] ([ContractId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ActivityEvents_ActorUserId] ON [ActivityEvents] ([ActorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ActivityEvents_ContractId_OccurredAt] ON [ActivityEvents] ([ContractId], [OccurredAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Categories_Code] ON [Categories] ([Code]) WHERE [IsDeleted] = 0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_Categories_IsActive_SortOrder] ON [Categories] ([IsActive], [SortOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_CategoryFields_CategoryId_FieldKey] ON [CategoryFields] ([CategoryId], [FieldKey]) WHERE [IsDeleted] = 0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_CategoryFields_CategoryId_IsActive_SortOrder] ON [CategoryFields] ([CategoryId], [IsActive], [SortOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractAssignments_ContractId] ON [ContractAssignments] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ContractAssignments_ContractId_ReviewerUserId] ON [ContractAssignments] ([ContractId], [ReviewerUserId]) WHERE [IsDeleted] = 0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractAssignments_ReviewerUserId] ON [ContractAssignments] ([ReviewerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractAttachmentBatches_ContractId] ON [ContractAttachmentBatches] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ContractAttachments_AttachmentGuid] ON [ContractAttachments] ([AttachmentGuid]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractAttachments_BatchId] ON [ContractAttachments] ([BatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractAttachments_ContractId] ON [ContractAttachments] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractComments_AuthorUserId] ON [ContractComments] ([AuthorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractComments_ContractId] ON [ContractComments] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractFieldValues_CategoryFieldId] ON [ContractFieldValues] ([CategoryFieldId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ContractFieldValues_ContractId_CategoryFieldId] ON [ContractFieldValues] ([ContractId], [CategoryFieldId]) WHERE [IsDeleted] = 0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractFieldValues_FieldKey] ON [ContractFieldValues] ([FieldKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractLanes_ContractId] ON [ContractLanes] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ContractLanes_ContractId_LaneId] ON [ContractLanes] ([ContractId], [LaneId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_ContractLanes_OwnerUserId_ContractId] ON [ContractLanes] ([OwnerUserId], [ContractId]) WHERE [Status] IN (2, 3)');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractNotes_AuthorUserId] ON [ContractNotes] ([AuthorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_ContractNotes_ContractId] ON [ContractNotes] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_Contracts_Category_Priority] ON [Contracts] ([Category], [Priority]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Contracts_ContractNumber] ON [Contracts] ([ContractNumber]) WHERE [IsDeleted] = 0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_Contracts_LastActionAt] ON [Contracts] ([LastActionAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_Contracts_OverallStatus] ON [Contracts] ([OverallStatus]) WHERE [OverallStatus] = 1');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_Contracts_ProcurementOwnerUserId] ON [Contracts] ([ProcurementOwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_Contracts_RequesterUserId] ON [Contracts] ([RequesterUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_Contracts_TermEndDate] ON [Contracts] ([TermEndDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_Contracts_VendorId] ON [Contracts] ([VendorId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_NotificationLogs_ContractId] ON [NotificationLogs] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_NotificationLogs_SentAt] ON [NotificationLogs] ([SentAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ReminderSettings_Category] ON [ReminderSettings] ([Category]) WHERE [IsDeleted] = 0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]) WHERE [IsDeleted] = 0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Vendors_Name] ON [Vendors] ([Name]) WHERE [IsDeleted] = 0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    CREATE INDEX [IX_Vendors_PreferredStatus] ON [Vendors] ([PreferredStatus]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260622211128_InitialV2Schema', N'10.0.9');
END;

COMMIT;
GO

