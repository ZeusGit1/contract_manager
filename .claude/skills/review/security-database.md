# Database Security Audit Checklist — Tier 1

Walk every OWASP category against the diff. For each potential finding, classify severity (Critical / High / Medium / Low) and decide whether the fix is mechanical (auto-apply per `remediation-database.md`) or architectural (surface in the batched prompt).

Tier 1 stack reference: SQL Server (Azure SQL in prod, LocalDB in dev) + EF Core for single-table operations + stored procedures via `ExecuteSqlRawAsync` / `FromSqlInterpolated` for everything else + tSQLt for stored-proc tests + AAD-only auth (no SQL passwords). Soft-deletes by default. Migrations applied manually dev → staging → prod (with the test-tenant deviation noted in `database-migrations.md`).

---

## A01: Broken Access Control

- **Missing row-level access filter** — queries returning user-scoped data without a `WHERE` clause filtering by the requesting user's ownership / role. Combined with the `IsDeleted = 0` filter from the soft-delete rule.
- **Stored procedures without authorization checks** — procedures that modify or return sensitive data without verifying the caller's identity / role. Tier 1 uses application-layer `[Authorize(Roles="…")]`, but defence-in-depth at the procedure level is encouraged for privileged operations.
- **Direct table access granted to the app service account** — Tier 1 default is the MI gets a database role with `EXECUTE` on procedures and `SELECT`/`INSERT`/`UPDATE`/`DELETE` on tables as needed (`api-secrets.md`). Flag any grant of `db_owner`, `sysadmin`, or `ALTER` to the app MI.
- **Soft-deleted records returned by default** — Tier 1 rule (`api-data-access.md`): every query against a soft-deletable table filters `WHERE IsDeleted = 0`. Flag any new query / stored procedure missing this filter unless the procedure is explicitly an admin/audit view.

---

## A02: Cryptographic Failures

- **Hardcoded credentials in SQL scripts** — connection strings, passwords, API keys in migration scripts, stored procedures, seed data. Flag as Critical.
- **Sensitive data stored unencrypted** — PII columns (SSN, financial identifiers, names, emails) without column-level encryption (Always Encrypted) or relying on TDE alone. Tier 1 data classification can extend to client matter / privileged content; columns holding that data warrant a Key Vault-backed column key.
- **Passwords stored without hashing** — Tier 1 uses Entra for authentication so the database does not store passwords. Flag any column whose name suggests a password.

---

## A03: Injection

- **Bare `sp_` prefix** — SQL Server searches `master` first for `sp_*` procedures (name-hijacking risk). Tier 1 rule (`database-coding-standards.md`): every procedure is `usp_<PascalCase>`. Always specify schema explicitly (`dbo.usp_…`).
- **Dynamic SQL with string concatenation** — any `EXEC('SELECT … ' + @userInput)` or string-built SQL. Must use `sp_executesql` with parameters. The application-side rule (`api-data-access.md`) is the same and must be enforced bidirectionally.
- **`xp_cmdshell` usage** — arbitrary command execution. Must never be enabled or used. Flag every occurrence as Critical.
- **Unparameterized stored-procedure inputs** — procedures accepting input but not using parameters in their internal queries.
- **Second-order injection** — user input stored in a table and later retrieved into dynamic SQL without parameterization.
- **`ORDER BY` injection** — `ORDER BY` clauses built from user input must use allowlists of valid column names. Direct interpolation is a finding.
- **`LIKE` clause injection** — user input in `LIKE` patterns must escape `%`, `_`, `[` to prevent wildcard exploitation.
- **Comment injection** — user input containing `--` or `/* */` in raw concatenated SQL. Parameterization prevents this; flag any non-parameterized usage.

---

## A04: Insecure Design

- **Hard delete instead of soft delete** — Tier 1 default is soft delete via `IsDeleted` + `DeletedAt` (`database-coding-standards.md`). Hard deletes only when explicitly justified for a given entity in `decisions.md`.
- **Bulk operations without safeguards** — stored procedures performing mass updates / deletes without row-count limits or confirmation parameters.
- **Missing pagination** — queries returning unbounded result sets. Pair with `OFFSET … FETCH` or keyset pagination per `database-stored-procedures.md`.
- **Missing required audit columns** — every table needs `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `DeletedAt` (`database-coding-standards.md`). Migrations that add a table without all six are findings.
- **Access-gate procedure that returns rows** — Tier 1 rule (`database-stored-procedures.md`): access-gate procedures (`usp_VerifyAccess_*`) must emit no result set — they either succeed silently or `THROW`. A gate that `SELECT`s its result shadows the outer procedure's result set when called via EF's `SqlQuery<T>` and silently binds to the wrong DTO.

---

## A05: Security Misconfiguration

- **Overly permissive service account** — see A01. Apply least privilege.
- **`TRUSTWORTHY ON`** — allows the database to access resources outside its scope. Must be `OFF` unless justified in `decisions.md`.
- **CLR assemblies with `UNSAFE` permission** — CLR code running with unrestricted access. Must use `SAFE` or `EXTERNAL_ACCESS` with documented justification.
- **Ownership chaining across schemas** — cross-schema ownership chains can bypass intended permission boundaries.
- **`xp_cmdshell` enabled at server level** — must be disabled.
- **Schema-unqualified object references** — Tier 1 rule (`database-coding-standards.md`): always specify the schema. Bare `Documents` instead of `dbo.Documents` is a finding (and a perf risk).

---

## A07: Authentication and Authorization

- **`EXECUTE AS` with broad scope** — impersonation context granting more permissions than necessary. Scope to specific procedures, not entire sessions.
- **`IMPERSONATE` granted broadly** — restrict to specific, justified use cases.
- **`GRANT OPTION` without justification** — `WITH GRANT OPTION` lets the grantee propagate permissions. Flag and require documented approval.
- **SQL-password connection strings** — Tier 1 default is AAD-only auth via Managed Identity (`api-secrets.md`). A connection string containing `User Id=` / `Password=` is a finding.

---

## A09: Security Logging and Monitoring

- **No audit table for sensitive changes** — Tier 1's 6 audit columns cover row-level "who and when," but full change history (old/new values) for sensitive tables (Users, role assignments, admin overrides) belongs in an append-only audit table.
- **Audit tables allowing UPDATE / DELETE** — audit tables must be append-only. Enforce with `DENY UPDATE, DELETE` to PUBLIC.
- **Missing audit triggers on sensitive tables** — tables containing privileged data benefit from `AFTER INSERT, UPDATE, DELETE` triggers writing to the audit table.
- **Sensitive data in error messages** — stored procedures that surface table names, column names, or data values in `THROW` / `RAISERROR` messages. The error contract is the application layer's RFC 7807 ProblemDetails; the procedure should rethrow opaquely.

---

## A10: Server-Side Request Forgery (SSRF)

- **Linked servers with user-controlled targets** — linked server configurations manipulable to access unintended targets.
- **`OPENROWSET` / `OPENDATASOURCE` with dynamic connection strings** — these can access external data sources. Connection strings must be hardcoded or from secure configuration, never user-supplied.
- **Unrestricted linked server access** — linked servers configured with broad permissions or against unrestricted databases.

---

## Advanced: Data Protection

- **Always Encrypted not used for high-sensitivity PII columns** — SSNs, financial identifiers, biometric data should use Always Encrypted with column-level keys in Azure Key Vault. Tier 1 data classification can reach client matter / privileged content; treat that bar accordingly.
- **Dynamic Data Masking not configured on selectively-visible columns** — useful for columns visible to general-role queries but needing partial obscuration (e.g., last 4 of an SSN).
- **TDE not enabled** — Transparent Data Encryption should be enabled on every Azure SQL database. Default for Azure SQL but verify.
- **Backup encryption not configured** — Azure SQL automated backups are encrypted by default; verify if a backup target is added in the diff.

---

## Advanced: Privilege Escalation Prevention

- **Stored procedures that change permissions** — any procedure executing `GRANT`, `REVOKE`, `ALTER ROLE` must be flagged. Permission changes belong in migration scripts, not runtime procedures.
- **Dynamic SQL with elevated context** — `EXECUTE AS` combined with dynamic SQL is a privilege-escalation vector. Flag every combination of impersonation + dynamic SQL.
- **Cross-database access without justification** — queries / procedures referencing other databases should be reviewed for necessity.

---

## Advanced: SQL Injection Deep Patterns

- **Second-order injection** — data stored from one request used unsafely in a later query (see A03).
- **`ORDER BY` injection** — allowlist column names (see A03).
- **`LIKE` injection** — escape wildcards (see A03).
- **Procedure-output binding** — see the access-gate rule above. A procedure that emits an unintended result set silently breaks EF's `SqlQuery<T>` binding.

---

## Migrations & Schema

- **Non-idempotent migration** — every numbered migration must guard with `IF NOT EXISTS` so re-running is a no-op (`database-migrations.md`). A migration that fails on re-run is a finding.
- **Missing rollback script** — every structural change needs a corresponding `*_Rollback.sql`. Mixing schema and data changes in one migration is a separate finding.
- **Hardcoded environment-specific values** — server names, connection strings, environment-conditional logic must not appear in migration scripts.
