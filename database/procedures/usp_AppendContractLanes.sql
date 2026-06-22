-- =============================================
-- Author:      AI Solutions Build (claude)
-- Create Date: 2026-06-22
-- Description: Inserts the 9 canonical lanes for a contract in a single transaction.
--              Idempotent — if all 9 lanes already exist for the ContractId, it's a no-op.
--              Procurement lane = InReview(2); the other 8 lanes = NotStarted(1).
--              The intake controller and bulk-upload commit call this proc inside the
--              same transaction that creates the Contracts row, so the 9-row invariant
--              holds atomically (ADR-030).
-- =============================================

CREATE OR ALTER PROCEDURE dbo.usp_AppendContractLanes
    @ContractId  INT,
    @ActorUserId NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @localContractId  INT          = @ContractId;
    DECLARE @localActorUserId NVARCHAR(256) = @ActorUserId;
    DECLARE @now              DATETIME2     = SYSUTCDATETIME();

    BEGIN TRY
    BEGIN TRANSACTION;

    -- Insert any missing lanes for this contract. The unique (ContractId, LaneId) index
    -- means duplicate inserts are impossible — but we still guard with NOT EXISTS to make
    -- the proc idempotent on re-run without throwing a constraint error.
    INSERT INTO dbo.ContractLanes
        (ContractId, LaneId, [Status], OwnerUserId, OwnerLabel, DueDate, LastUpdated, Note,
         CreatedAt, UpdatedAt, CreatedBy, UpdatedBy, IsDeleted)
    SELECT
        @localContractId,
        L.LaneId,
        CASE WHEN L.LaneId = 1 /* Procurement */ THEN 2 /* InReview */ ELSE 1 /* NotStarted */ END,
        NULL,
        NULL,
        NULL,
        @now,
        NULL,
        @now,
        @now,
        @localActorUserId,
        @localActorUserId,
        0
    FROM (VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9)) AS L(LaneId)
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.ContractLanes existing
        WHERE existing.ContractId = @localContractId AND existing.LaneId = L.LaneId
    );

    COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
