-- =============================================
-- Author:      AI Solutions Build (claude)
-- Create Date: 2026-06-22
-- Description: Rollback for 20260622_002_SeedSystemCategories.sql. Hard-deletes the three
--              system categories and their fields ONLY if no contracts reference them.
--              Idempotent.
-- =============================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
BEGIN TRANSACTION;

DECLARE @CategoryIds TABLE (CategoryId INT);
INSERT INTO @CategoryIds (CategoryId)
SELECT CategoryId FROM dbo.Categories WHERE Code IN ('Event', 'Facilities', 'IT');

-- Guard: refuse to remove if any contracts reference these categories (by domain enum, not FK).
-- Categories table doesn't FK from Contracts (Contracts.Category is the domain enum value), so
-- this is a separate sanity gate.
IF EXISTS (
    SELECT 1 FROM dbo.Contracts WHERE Category IN (1,2,3) AND IsDeleted = 0
)
BEGIN
    RAISERROR(N'Cannot roll back system-category seed: active contracts reference these categories.', 16, 1);
    ROLLBACK TRANSACTION;
    RETURN;
END;

DELETE FROM dbo.CategoryFields WHERE CategoryId IN (SELECT CategoryId FROM @CategoryIds);
DELETE FROM dbo.Categories WHERE CategoryId IN (SELECT CategoryId FROM @CategoryIds);

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
