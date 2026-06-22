BEGIN TRANSACTION;
IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [ActivityEvents];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [ContractAssignments];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [ContractAttachments];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [ContractComments];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [ContractFieldValues];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [ContractLanes];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [ContractNotes];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [NotificationLogs];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [ReminderSettings];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [ContractAttachmentBatches];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [CategoryFields];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [Contracts];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [Categories];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [Users];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DROP TABLE [Vendors];
END;

IF EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema'
)
BEGIN
    DELETE FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622211128_InitialV2Schema';
END;

COMMIT;
GO

