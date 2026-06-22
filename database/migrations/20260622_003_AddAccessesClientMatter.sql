-- =============================================
-- Author:      Lisa Farkas (DEV)
-- Create Date: 2026-06-22
-- Description: Adds Contracts.AccessesClientMatter — IT risk-review indicator
--              flagging whether the system accesses client/matter data.
--              Sibling to AccessesPersonalData / AccessesPHI / UsesAI.
-- =============================================
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE [object_id] = OBJECT_ID(N'dbo.Contracts')
      AND [name] = N'AccessesClientMatter'
)
BEGIN
    ALTER TABLE [dbo].[Contracts] ADD [AccessesClientMatter] BIT NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM [dbo].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260622231923_AddAccessesClientMatter'
)
BEGIN
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260622231923_AddAccessesClientMatter', N'10.0.9');
END;

COMMIT;
