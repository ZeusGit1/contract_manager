# Database Security Remediation Patterns — Tier 1

Auto-apply mechanical fixes; surface architectural fixes in the batched prompt. Every applied fix is recorded in `artifacts/docs/dev/reviews/remediations-applied/<label>.md` per the SKILL.md flow.

## Auto-fixable (apply, re-run tSQLt, record)

### One-liner fixes

- **Missing soft-delete filter** — add `AND IsDeleted = 0` to the `WHERE` clause (or the EF Core query filter on the entity). Tier 1 rule (`api-data-access.md`).
- **Missing schema qualifier** — replace bare `TableName` with `dbo.TableName` everywhere (`database-coding-standards.md`).
- **Bare `sp_` prefix** — rename `sp_<Name>` to `usp_<Name>` and update every call site. Use `CREATE OR ALTER PROCEDURE` so permissions are preserved.
- **Hardcoded credentials in script** — remove entirely. Connections must use Managed Identity (`api-secrets.md`). Flag the previously-committed value for rotation.
- **`xp_cmdshell` usage** — remove entirely. Flag as Critical. If the procedure has no other purpose, drop it; otherwise replace with a non-shell mechanism.
- **Hard delete → soft delete** — change `DELETE FROM dbo.<Table> WHERE …` to `UPDATE dbo.<Table> SET IsDeleted = 1, DeletedAt = SYSUTCDATETIME(), UpdatedBy = @CallerUserId, UpdatedAt = SYSUTCDATETIME() WHERE …`.
- **`TRUSTWORTHY ON`** — `ALTER DATABASE [<db>] SET TRUSTWORTHY OFF`. Document if there's a legitimate reason it was on.
- **`EXECUTE AS` at session scope** — refactor to per-procedure `WITH EXECUTE AS 'user'` instead of `EXECUTE AS USER = '…'` as a session statement.
- **`OPENROWSET` / `OPENDATASOURCE` with dynamic connection** — remove or replace with a configured linked server.
- **Missing audit columns on a new table** — add `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `DeletedAt` per `database-coding-standards.md`.
- **Missing `IF NOT EXISTS` on a `CREATE TABLE` / `CREATE INDEX` migration** — wrap in the appropriate idempotency guard (`database-migrations.md`).
- **Access-gate procedure that `SELECT`s its result** — remove the `SELECT`. The gate must succeed silently or `THROW` (`database-stored-procedures.md`). If callers need the access role, expose it via a separate `usp_GetAccessRole`.

### Pattern fixes

**Dynamic SQL → parameterized**

```sql
-- Before (forbidden)
EXEC('SELECT * FROM dbo.Users WHERE Name = ''' + @Name + '''');

-- After (parameterized)
EXEC sp_executesql
    N'SELECT * FROM dbo.Users WHERE Name = @Name',
    N'@Name NVARCHAR(100)',
    @Name;
```

**`ORDER BY` injection — allowlist**

```sql
DECLARE @SafeSort NVARCHAR(50) = CASE @SortColumn
    WHEN 'Title'     THEN 'Title'
    WHEN 'CreatedAt' THEN 'CreatedAt'
    WHEN 'Status'    THEN 'Status'
    ELSE 'CreatedAt'
END;

EXEC sp_executesql
    N'SELECT … FROM dbo.<Table> ORDER BY ' + @SafeSort,
    N'<params>', <values>;
```

The `ORDER BY` is still substituted, but only with values from the allowlist `CASE`.

**`LIKE` clause — escape wildcards**

```sql
SET @SafeTerm = REPLACE(REPLACE(REPLACE(@SearchTerm, '[', '[[]'), '%', '[%]'), '_', '[_]');
-- Then use @SafeTerm in: WHERE Column LIKE @SafeTerm + '%'
```

**Least-privilege grant for the app MI**

```sql
-- Revoke broad role if present
ALTER ROLE db_owner DROP MEMBER [<AppMiName>];

-- Grant only what's needed
GRANT EXECUTE ON dbo.usp_GetX  TO [<AppMiName>];
GRANT EXECUTE ON dbo.usp_AddX  TO [<AppMiName>];
GRANT SELECT, INSERT, UPDATE ON dbo.<Table> TO [<AppMiName>];
```

**Append-only audit table**

```sql
CREATE TABLE dbo.AuditLog (
    Id          BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLog PRIMARY KEY,
    TableName   NVARCHAR(128)        NOT NULL,
    RecordId    NVARCHAR(128)        NOT NULL,
    Action      NVARCHAR(10)         NOT NULL,
    ChangedBy   NVARCHAR(128)        NOT NULL,
    ChangedAt   DATETIME2            NOT NULL DEFAULT SYSUTCDATETIME(),
    OldValues   NVARCHAR(MAX)        NULL,
    NewValues   NVARCHAR(MAX)        NULL
);
DENY UPDATE, DELETE ON dbo.AuditLog TO PUBLIC;
```

**Audit trigger on a sensitive table**

```sql
CREATE OR ALTER TRIGGER dbo.trg_<Table>_Audit ON dbo.<Table>
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.AuditLog (TableName, RecordId, Action, ChangedBy, ChangedAt, OldValues, NewValues)
    SELECT
        '<Table>',
        COALESCE(CAST(i.Id AS NVARCHAR(128)), CAST(d.Id AS NVARCHAR(128))),
        CASE
            WHEN i.Id IS NOT NULL AND d.Id IS NOT NULL THEN 'UPDATE'
            WHEN i.Id IS NOT NULL                       THEN 'INSERT'
            ELSE                                            'DELETE'
        END,
        COALESCE(i.UpdatedBy, d.CreatedBy, SUSER_SNAME()),
        SYSUTCDATETIME(),
        (SELECT d.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i
    FULL OUTER JOIN deleted d ON i.Id = d.Id;
END;
```

**Rollback script template** (`database-migrations.md`)

Every structural change needs a paired `*_Rollback.sql` that is also idempotent:

```sql
-- Rollback for YYYYMMDD_NNN_AddXTable.sql
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = '<Table>' AND schema_id = SCHEMA_ID('dbo'))
    DROP TABLE dbo.<Table>;
```

---

## Manual (report + suggest approach; do not auto-apply)

- **Row-Level Security implementation** — adding a security predicate function and binding it to a table is a structural change with knock-on effects on every query. Surface as architectural; let the developer wire the policy.
- **Always Encrypted on PII columns** — requires Key Vault-backed column keys and app-side driver support. Multi-file change; document in `decisions.md` and surface.
- **TDE enablement** — Azure SQL has TDE on by default; if it's somehow off, the developer should re-enable via the Azure portal or an `ALTER DATABASE` admin command. Don't auto-apply server-level admin changes.
- **Dynamic Data Masking** — adding masking functions to sensitive columns affects every query that consumes the column. Propose the masking definition and which roles get `UNMASK`.
- **CLR assembly security** — evaluate whether T-SQL can replace the CLR; if not, set permission to `SAFE` and document the justification.
- **Procedure-based access pattern** — migrating from direct table access to procedure-only access for the app MI is a multi-PR change; propose and let the developer execute.
- **Privilege-escalation procedure** — any procedure executing `GRANT` / `REVOKE` / `ALTER ROLE` belongs in a migration script, not in runtime code. Surface the existing procedure and propose the migration.
- **Cross-database access** — review necessity and permission scoping; do not auto-add linked servers.
- **Access-gate procedure design** — adding `usp_VerifyAccess_*` patterns to procedures that currently mix authz and reads is an architectural refactor. Propose and let the developer apply.
