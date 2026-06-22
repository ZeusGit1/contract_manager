-- =============================================
-- Author:      AI Solutions Build (claude)
-- Create Date: 2026-06-22
-- Description: Seeds the three system-defined categories (Event / Facilities / IT) and their
--              system-defined fields. Idempotent — uses MERGE so re-running does not create
--              duplicates. System fields back typed Contracts columns (ADR-037); their values
--              are stored on Contracts directly, not in ContractFieldValues.
-- =============================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
BEGIN TRANSACTION;

-- Categories
;WITH SystemCategories AS (
    SELECT * FROM (VALUES
        ('Event',      'Event',      'ticket',   1, 1),
        ('Facilities', 'Facilities', 'wrench',   2, 1),
        ('IT',         'IT',         'desktop',  3, 1)
    ) AS V(Code, Label, IconKey, SortOrder, IsSystemDefined)
)
MERGE dbo.Categories AS target
USING SystemCategories AS source
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET
    target.Label = source.Label,
    target.IconKey = source.IconKey,
    target.SortOrder = source.SortOrder,
    target.IsSystemDefined = source.IsSystemDefined,
    target.UpdatedAt = SYSUTCDATETIME(),
    target.UpdatedBy = N'system:seed'
WHEN NOT MATCHED THEN
    INSERT (Code, Label, IconKey, SortOrder, IsSystemDefined, IsActive, CreatedBy, UpdatedBy)
    VALUES (source.Code, source.Label, source.IconKey, source.SortOrder, source.IsSystemDefined, 1, N'system:seed', N'system:seed');

-- Resolve seeded category IDs into local variables
DECLARE @EventId      INT = (SELECT CategoryId FROM dbo.Categories WHERE Code = 'Event' AND IsDeleted = 0);
DECLARE @FacilitiesId INT = (SELECT CategoryId FROM dbo.Categories WHERE Code = 'Facilities' AND IsDeleted = 0);
DECLARE @ITId         INT = (SELECT CategoryId FROM dbo.Categories WHERE Code = 'IT' AND IsDeleted = 0);

-- CategoryFields — Type enum: 1=Text, 2=Date, 3=Select, 4=Radio, 5=YesNo, 6=Number
-- All seeded fields are IsSystemDefined=1 — values land in typed Contracts columns, not ContractFieldValues.
;WITH SystemFields AS (
    SELECT * FROM (VALUES
        -- Event
        (@EventId,      'eventName',       N'Event name',                1, NULL,                                                   1, 1, 1),
        (@EventId,      'eventDate',       N'Event date',                2, N'Date the event occurs.',                              1, 2, 1),
        (@EventId,      'venueLocation',   N'Venue / location',          1, N'Physical venue address or virtual platform.',        0, 3, 1),
        (@EventId,      'parentEventName', N'Parent event (if any)',     1, N'Use this when the event is part of a larger program.',0, 4, 1),
        -- Facilities
        (@FacilitiesId, 'building',        N'Building',                  1, N'Firm building / floor where the service applies.',   1, 1, 1),
        (@FacilitiesId, 'serviceDescription', N'Service description',    1, N'Plain-language description of the service or work.', 1, 2, 1),
        -- IT
        (@ITId,         'itType',          N'IT type',                   3, N'Software vs Professional Services drives review routing.', 1, 1, 1),
        (@ITId,         'applicationName', N'Application name',          1, N'For Software contracts.',                            0, 2, 1),
        (@ITId,         'applicationVersion', N'Application version',    1, NULL,                                                   0, 3, 1),
        (@ITId,         'licensingType',   N'Licensing model',           3, NULL,                                                   0, 4, 1),
        (@ITId,         'numberOfUsers',   N'Number of users',           6, NULL,                                                   0, 5, 1),
        (@ITId,         'cloudOrOnPrem',   N'Cloud or on-prem',          3, NULL,                                                   0, 6, 1),
        (@ITId,         'systemAccess',    N'System access',             1, N'Which firm systems will this access?',               0, 7, 1),
        (@ITId,         'permissions',     N'Permissions',               1, NULL,                                                   0, 8, 1),
        (@ITId,         'integrations',    N'Integrations',              1, NULL,                                                   0, 9, 1),
        (@ITId,         'accessesPersonalData', N'Accesses personal data?', 5, NULL,                                                1, 10, 1),
        (@ITId,         'accessesPHI',     N'Accesses PHI?',             5, NULL,                                                   1, 11, 1),
        (@ITId,         'usesAI',          N'Uses AI?',                  5, NULL,                                                   1, 12, 1)
    ) AS V(CategoryId, FieldKey, Label, [Type], HelperText, IsRequired, SortOrder, IsSystemDefined)
)
MERGE dbo.CategoryFields AS target
USING SystemFields AS source
ON target.CategoryId = source.CategoryId AND target.FieldKey = source.FieldKey
WHEN MATCHED THEN UPDATE SET
    target.Label = source.Label,
    target.[Type] = source.[Type],
    target.HelperText = source.HelperText,
    target.IsRequired = source.IsRequired,
    target.SortOrder = source.SortOrder,
    target.IsSystemDefined = source.IsSystemDefined,
    target.UpdatedAt = SYSUTCDATETIME(),
    target.UpdatedBy = N'system:seed'
WHEN NOT MATCHED THEN
    INSERT (CategoryId, FieldKey, Label, [Type], HelperText, IsRequired, SortOrder, IsSystemDefined, IsActive, CreatedBy, UpdatedBy)
    VALUES (source.CategoryId, source.FieldKey, source.Label, source.[Type], source.HelperText, source.IsRequired,
            source.SortOrder, source.IsSystemDefined, 1, N'system:seed', N'system:seed');

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
