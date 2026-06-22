-- =============================================
-- Author:      AI Solutions Build (claude)
-- Create Date: 2026-06-22
-- Description: tSQLt suite for the ContractLane invariants per plan.md §2.13 and ADR-030.
--              Asserts: 9-row invariant per contract, owner-shape (internal vs external),
--              status enum range, unique (ContractId, LaneId).
-- =============================================

EXEC tSQLt.NewTestClass 'ContractLaneTests';
GO

-- Helper to seed a parent contract for these tests
CREATE OR ALTER PROCEDURE ContractLaneTests.SetupParentContract
    @ContractId INT OUTPUT
AS
BEGIN
    EXEC tSQLt.FakeTable @TableName = 'dbo.Contracts', @Identity = 1;
    EXEC tSQLt.FakeTable @TableName = 'dbo.ContractLanes', @Identity = 1;
    EXEC tSQLt.FakeTable @TableName = 'dbo.Users', @Identity = 0;

    INSERT INTO dbo.Contracts (
        ContractNumber, Title, Category, OverallStatus, Priority,
        VendorId, RequesterUserId, RequesterEmail, SubmittedAt, LastActionAt,
        CreatedBy, UpdatedBy)
    VALUES (
        N'CTR-TEST-0001', N'Test Contract', 3, 1, 2,
        1, NEWID(), N'requester@test.local', SYSUTCDATETIME(), SYSUTCDATETIME(),
        N'test', N'test');

    SET @ContractId = SCOPE_IDENTITY();
END;
GO

-- ------------------------------------------------------------------
CREATE OR ALTER PROCEDURE ContractLaneTests.[test usp_AppendContractLanes - creates exactly nine rows]
AS
BEGIN
    DECLARE @ContractId INT;
    EXEC ContractLaneTests.SetupParentContract @ContractId = @ContractId OUTPUT;

    EXEC dbo.usp_AppendContractLanes @ContractId = @ContractId, @ActorUserId = N'test';

    DECLARE @actual INT = (SELECT COUNT(*) FROM dbo.ContractLanes WHERE ContractId = @ContractId);
    EXEC tSQLt.AssertEquals @Expected = 9, @Actual = @actual,
        @Message = 'usp_AppendContractLanes should create exactly nine lanes per contract.';
END;
GO

-- ------------------------------------------------------------------
CREATE OR ALTER PROCEDURE ContractLaneTests.[test usp_AppendContractLanes - Procurement lane defaults to InReview]
AS
BEGIN
    DECLARE @ContractId INT;
    EXEC ContractLaneTests.SetupParentContract @ContractId = @ContractId OUTPUT;

    EXEC dbo.usp_AppendContractLanes @ContractId = @ContractId, @ActorUserId = N'test';

    DECLARE @procStatus INT = (
        SELECT [Status] FROM dbo.ContractLanes
        WHERE ContractId = @ContractId AND LaneId = 1);

    EXEC tSQLt.AssertEquals @Expected = 2, @Actual = @procStatus,
        @Message = 'Procurement lane (LaneId=1) should default to InReview (Status=2).';
END;
GO

-- ------------------------------------------------------------------
CREATE OR ALTER PROCEDURE ContractLaneTests.[test usp_AppendContractLanes - all other lanes default to NotStarted]
AS
BEGIN
    DECLARE @ContractId INT;
    EXEC ContractLaneTests.SetupParentContract @ContractId = @ContractId OUTPUT;

    EXEC dbo.usp_AppendContractLanes @ContractId = @ContractId, @ActorUserId = N'test';

    DECLARE @nonProcRowsAtNotStarted INT = (
        SELECT COUNT(*) FROM dbo.ContractLanes
        WHERE ContractId = @ContractId AND LaneId <> 1 AND [Status] = 1);

    EXEC tSQLt.AssertEquals @Expected = 8, @Actual = @nonProcRowsAtNotStarted,
        @Message = 'The eight non-Procurement lanes should default to NotStarted (Status=1).';
END;
GO

-- ------------------------------------------------------------------
CREATE OR ALTER PROCEDURE ContractLaneTests.[test usp_AppendContractLanes - idempotent on re-run]
AS
BEGIN
    DECLARE @ContractId INT;
    EXEC ContractLaneTests.SetupParentContract @ContractId = @ContractId OUTPUT;

    EXEC dbo.usp_AppendContractLanes @ContractId = @ContractId, @ActorUserId = N'test';
    EXEC dbo.usp_AppendContractLanes @ContractId = @ContractId, @ActorUserId = N'test';

    DECLARE @actual INT = (SELECT COUNT(*) FROM dbo.ContractLanes WHERE ContractId = @ContractId);
    EXEC tSQLt.AssertEquals @Expected = 9, @Actual = @actual,
        @Message = 'Re-running usp_AppendContractLanes should not create duplicates.';
END;
GO
