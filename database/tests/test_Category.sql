-- =============================================
-- Author:      AI Solutions Build (claude)
-- Create Date: 2026-06-22
-- Description: tSQLt suite for the Category seed + system protections per ADR-037.
--              Asserts: the three system categories exist after seed, each has at least
--              one system-defined field, IsSystemDefined=1 on the seeded rows.
-- =============================================

EXEC tSQLt.NewTestClass 'CategoryTests';
GO

-- ------------------------------------------------------------------
CREATE OR ALTER PROCEDURE CategoryTests.[test seed - three system categories exist]
AS
BEGIN
    -- This test runs against the real Categories table after the seed migration has been applied.
    -- It does NOT fake the table — it asserts the seeded state.

    DECLARE @count INT = (
        SELECT COUNT(*) FROM dbo.Categories
        WHERE Code IN ('Event', 'Facilities', 'IT')
          AND IsSystemDefined = 1
          AND IsDeleted = 0);

    EXEC tSQLt.AssertEquals @Expected = 3, @Actual = @count,
        @Message = 'Expected three IsSystemDefined=1 categories (Event, Facilities, IT).';
END;
GO

-- ------------------------------------------------------------------
CREATE OR ALTER PROCEDURE CategoryTests.[test seed - each system category has at least one system field]
AS
BEGIN
    DECLARE @missing INT = (
        SELECT COUNT(*) FROM dbo.Categories c
        WHERE c.IsSystemDefined = 1
          AND c.IsDeleted = 0
          AND NOT EXISTS (
              SELECT 1 FROM dbo.CategoryFields f
              WHERE f.CategoryId = c.CategoryId
                AND f.IsSystemDefined = 1
                AND f.IsDeleted = 0));

    EXEC tSQLt.AssertEquals @Expected = 0, @Actual = @missing,
        @Message = 'Every system category must have at least one IsSystemDefined=1 field.';
END;
GO
