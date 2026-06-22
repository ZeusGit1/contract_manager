-- =============================================
-- Author:      Lisa Farkas (DEV)
-- Create Date: 2026-06-22
-- Description: Rollback for 20260622_003_AddAccessesClientMatter.
-- =============================================
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE [object_id] = OBJECT_ID(N'dbo.Contracts')
      AND [name] = N'AccessesClientMatter'
)
BEGIN
    ALTER TABLE [dbo].[Contracts] DROP COLUMN [AccessesClientMatter];
END;

DELETE FROM [dbo].[__EFMigrationsHistory]
 WHERE [MigrationId] = N'20260622231923_AddAccessesClientMatter';

COMMIT;
