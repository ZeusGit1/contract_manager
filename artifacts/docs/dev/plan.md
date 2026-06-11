# Contract Manager — Tier 1 Plan

**Sensitivity:** Confidential by default; Privileged for any contract routed through Legal / GCO; PII present (vendor contacts, requester / reviewer identities, signers). See `solution-requirements.md` Section 4 / Section 10 for the full handling rules.
**Users:** Procurement team (~5 power users: Lisa Farkas, Rich Patterson, Noor Abid plus growth headroom); ~50 Attorney Reviewers across Privacy / InfoSec / GCO / Legal / Litigation / Corporate; firm-wide Requesters (~500 staff + attorneys). Peak concurrent users well under the 100-user Tier 1 ceiling.
**Stack:** React 19 + TS + Vite (web); ASP.NET Core 10 controllers + EF Core + Microsoft.Identity.Web (api); SQL Server (db); Azure App Service + Azure SQL hosting.
**Time budget:** ~6–8 focused hours — top end of Tier 1 because the product covers 17 in-scope screens across three roles plus a bulk-upload pipeline. The build is wide but each screen is mostly variations on patterns already established by the prototype.

> **Design handoff present.** `/build` implements every in-scope screen against it: prototyped screens (S2, S3, S5, S8, S12) from `artifacts/docs/design/project/`; deferred screens (S1, S4, S6, S7, S10, S11, S13–S16, S17, S18) from `artifacts/docs/design/full-design-blueprint.md`. Tokens and styling come from the repo design system (`.claude/rules/design/`).

---

## 1. Tier 1 gate confirmation

- [x] **Named group of ≤ ~100 concurrent firm users:** Procurement team + Attorney Reviewers + Requesters across the firm directory; expected peak concurrency well under 100 (active dashboard users are the small Procurement team).
- [x] **Single-tenant Entra, app roles for authorization:** three roles — `Procurement`, `Requester`, `AttorneyReviewer`. App-role membership maps directly to `[Authorize(Roles="...")]` per `api-record-access.md`.
- [x] **Row access is app-managed, not external client-matter:** Procurement sees all contracts (role-wide); Requester sees contracts where they are the `RequesterUserId` (ownership); Attorney Reviewer sees contracts where they appear in `ContractAssignment` (in-app assignment). No client/matter system is consulted. Composes as OR per the rule file.
- [x] **Azure App Service + Azure SQL hosting:** standard Tier 1 stack; LocalDB for dev.
- [x] **No doc processing / workers / vector search / external audience (basic file attachments OK):** contracts and supporting documents are stored as Blob attachments via `api-blob-attachments.md`; the app never reads *into* the file. No Service Bus, no extraction, no embeddings. Audience is internal firm staff.

---

## 2. Data model

Ten entities. Every table carries the six mandatory audit columns (`CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `DeletedAt`) — abbreviated below as `// + audit`. Soft-delete only (perpetual retention is a hard requirement, Section 6 of the brief). Identifier columns referenced in logs follow `api-logging.md`: only the Entra `oid` (`UserId`) is permitted; never the email or display name.

### 2.1 `Vendor`

```csharp
public class Vendor {
    public int VendorId { get; set; }                  // PK
    public string VendorCode { get; set; }              // optional external code, e.g. V-0001 from seed
    public string Name { get; set; }                    // NVARCHAR(256), unique on normalized form
    public VendorType Type { get; set; }                // EventVenue / FacilitiesService / Software / ProfessionalServices
    public PreferredStatus PreferredStatus { get; set; }// Preferred / Standard / Difficult / Blacklisted
    public string? PrimaryContactName { get; set; }     // NVARCHAR(256)
    public string? PrimaryContactEmail { get; set; }    // NVARCHAR(320)
    public string? PrimaryContactPhone { get; set; }    // NVARCHAR(64)
    public string? PrimaryContactRole { get; set; }     // NVARCHAR(128) — e.g. "Account Executive"
    public string? Location { get; set; }               // NVARCHAR(256)
    public string? VendorSinceText { get; set; }        // NVARCHAR(32) — display only, free-form year/era
    public string? Notes { get; set; }                  // NVARCHAR(MAX) — vendor history / commentary
    // + audit
}
```
**Indexes:** `IX_Vendor_Name` (unique on `LOWER(Name)` via computed column or filtered unique on `Name + IsDeleted=0`), `IX_Vendor_PreferredStatus` (filtered for `Blacklisted` row-lookup fast path).
**Check constraints:** `CK_Vendor_Type`, `CK_Vendor_PreferredStatus`.

### 2.2 `Contract`

```csharp
public class Contract {
    public int ContractId { get; set; }                       // PK
    public string ContractNumber { get; set; }                // NVARCHAR(24) — display ID, e.g. CN-2026-0042; unique
    public string Title { get; set; }                         // NVARCHAR(256)
    public Category Category { get; set; }                    // Event / Facilities / IT
    public ContractStatus Status { get; set; }                // 13-value enum (see §2.10)
    public int VendorId { get; set; }                         // FK → Vendor
    public Guid RequesterUserId { get; set; }                 // FK → User (Entra oid)
    public Guid? AssignedReviewerUserId { get; set; }         // FK → User — the *lead* Procurement-side owner
    public decimal? TotalCostUsd { get; set; }                // DECIMAL(18,2)
    public DateTime? SignatureDeadline { get; set; }          // DATETIME2
    public DateTime SubmittedAt { get; set; }
    public DateTime? TermStartDate { get; set; }
    public DateTime? TermEndDate { get; set; }
    public DateTime LastActionAt { get; set; }                // updated by every status change / activity event
    public DateTime? NextActionDueAt { get; set; }            // Procurement sets; drives dashboard priority
    public string? Description { get; set; }                  // NVARCHAR(MAX)
    // Event-only fields (nullable):
    public DateTime? EventDate { get; set; }
    public string? VenueLocation { get; set; }                // NVARCHAR(256)
    public bool? PartOfLargerEvent { get; set; }
    public string? ParentEventName { get; set; }              // NVARCHAR(256)
    // Facilities-only fields (nullable):
    public string? ServiceDescription { get; set; }           // NVARCHAR(MAX)
    // IT-only fields (nullable):
    public ITType? ITType { get; set; }                       // Software / ProfessionalServices
    public string? ApplicationName { get; set; }              // NVARCHAR(256)
    public string? ApplicationVersion { get; set; }           // NVARCHAR(128)
    public LicensingType? LicensingType { get; set; }         // Subscription / Perpetual / PerUser
    public int? NumberOfUsers { get; set; }
    public Hosting? CloudOrOnPrem { get; set; }               // Cloud / OnPremise / Hybrid
    public string? SystemAccess { get; set; }                 // NVARCHAR(MAX)
    public string? Permissions { get; set; }                  // NVARCHAR(MAX)
    public string? Integrations { get; set; }                 // NVARCHAR(MAX)
    public bool? AccessesPersonalData { get; set; }
    public bool? AccessesPHI { get; set; }
    public bool? UsesAI { get; set; }
    // + audit
}
```
**Indexes:** `IX_Contract_VendorId`, `IX_Contract_RequesterUserId`, `IX_Contract_AssignedReviewerUserId`, `IX_Contract_Status` (filtered on non-archived statuses for dashboard query), `IX_Contract_TermEndDate` (for the Renewal Report), `IX_Contract_NextActionDueAt` (default dashboard sort).
**Check constraints:** `CK_Contract_Status`, `CK_Contract_Category`, `CK_Contract_ITType`, `CK_Contract_LicensingType`, `CK_Contract_CloudOrOnPrem`. Plus conditional `CK_Contract_CategoryShape` enforcing that category-specific fields are populated only when category matches (e.g., `EventDate` only when `Category = Event`).
**Unique constraint:** `UX_Contract_ContractNumber` (unique on `ContractNumber + IsDeleted=0`).

### 2.3 `User`

```csharp
public class User {
    public Guid UserId { get; set; }                  // PK — Entra oid
    public string DisplayName { get; set; }           // NVARCHAR(256) — from token claim, never logged
    public string Email { get; set; }                 // NVARCHAR(320) — preferred_username, never logged
    public string? Department { get; set; }           // NVARCHAR(128) — optional
    public DateTime FirstSignInAt { get; set; }
    // + audit
}
```
**Indexes:** `IX_User_Email` (unique, used by vendor-side `User.Read.All` Graph lookup if email-share is ever needed — out of POC scope).
**Provisioning:** `EnsureUserMiddleware` per `api-auth.md` upserts on first authenticated request.

### 2.4 `ContractAssignment` (Reviewer ↔ Contract many-to-many)

```csharp
public class ContractAssignment {
    public int ContractAssignmentId { get; set; }       // PK
    public int ContractId { get; set; }                 // FK → Contract
    public Guid ReviewerUserId { get; set; }            // FK → User
    public string ReviewerTeam { get; set; }            // NVARCHAR(64) — Privacy / InfoSec / GCO / Legal / etc.
    public DateTime AssignedAt { get; set; }
    public Guid AssignedByUserId { get; set; }          // FK → User — Procurement member
    // + audit
}
```
**Indexes:** `IX_ContractAssignment_ContractId`, `IX_ContractAssignment_ReviewerUserId`. Unique on `(ContractId, ReviewerUserId)` filtered for `IsDeleted = 0` — a contract can have multiple reviewers, but no duplicate reviewer per contract.

### 2.5 `ContractComment` (running internal stream — Comments tab)

```csharp
public class ContractComment {
    public int ContractCommentId { get; set; }          // PK
    public int ContractId { get; set; }                 // FK → Contract
    public Guid AuthorUserId { get; set; }              // FK → User
    public string AuthorRoleSnapshot { get; set; }      // NVARCHAR(64) — role at time of writing (Procurement / Reviewer / Requester)
    public string Text { get; set; }                    // NVARCHAR(MAX)
    public bool IsInternalOnly { get; set; }            // hidden from Requester variant
    // + audit
}
```
**Indexes:** `IX_ContractComment_ContractId`.

### 2.6 `ContractNote` (typed discussion log — Notes tab)

```csharp
public class ContractNote {
    public int ContractNoteId { get; set; }             // PK
    public int ContractId { get; set; }                 // FK → Contract
    public Guid AuthorUserId { get; set; }              // FK → User
    public NoteType Type { get; set; }                  // Meeting / Call / Email / Note
    public DateTime NoteDate { get; set; }              // DATE — when the discussion happened
    public string? Participants { get; set; }           // NVARCHAR(512) — free text
    public string Text { get; set; }                    // NVARCHAR(MAX)
    // + audit
}
```
**Indexes:** `IX_ContractNote_ContractId`. Check constraint `CK_ContractNote_Type`.

### 2.7 `ContractAttachment` (file attachments — per `api-blob-attachments.md`)

```csharp
public class ContractAttachment {
    public int ContractAttachmentId { get; set; }       // PK — also the opaque blob name (Guid serialized; see §2.7 note)
    public Guid AttachmentGuid { get; set; }            // unique blob name; written before upload
    public int ContractId { get; set; }                 // FK → Contract (the "parent" per the rule file)
    public int? BatchId { get; set; }                   // FK → ContractAttachmentBatch (nullable for single-file uploads)
    public string BlobPath { get; set; }                // NVARCHAR(512) — exact path; SQL is authoritative
    public string FileName { get; set; }                // NVARCHAR(256) — original, sanitized
    public string ContentType { get; set; }             // NVARCHAR(128)
    public long SizeBytes { get; set; }
    public AttachmentStatus Status { get; set; }        // Pending / Stored / Failed (terminal on upload return)
    // + audit
}

public class ContractAttachmentBatch {
    public int BatchId { get; set; }                    // PK
    public int ContractId { get; set; }                 // FK → Contract
    public int TotalAttachments { get; set; }
    public BatchStatus Status { get; set; }             // Pending / InProgress / Complete
    // + audit
}
```
**Indexes:** `IX_ContractAttachment_ContractId`, `IX_ContractAttachment_BatchId`, `IX_ContractAttachmentBatch_ContractId`. Blob name path shape is recorded in `decisions.md` ADR-008.

### 2.8 `ActivityEvent` (Activity tab + audit trail)

```csharp
public class ActivityEvent {
    public long ActivityEventId { get; set; }           // PK BIGINT — high volume
    public int ContractId { get; set; }                 // FK → Contract
    public Guid ActorUserId { get; set; }               // FK → User — who performed the action
    public ActivityType Type { get; set; }              // StatusChanged / Reassigned / CommentAdded / NoteAdded / AttachmentAdded / NotificationSent / NextDueUpdated / BulkImported
    public string DescriptionLine { get; set; }         // NVARCHAR(512) — denormalized display ("Status changed to With InfoSec")
    public string? StructuredJson { get; set; }         // NVARCHAR(MAX) — optional structured payload (from/to status, reviewer ids, etc.)
    public DateTime OccurredAt { get; set; }
    // + audit (DeletedAt unused in practice — events are append-only)
}
```
**Indexes:** `IX_ActivityEvent_ContractId_OccurredAt` (clustered or composite for activity-feed query).
**Note:** denormalizing the display line keeps the Activity tab a single non-joined query; the structured JSON is for any future cross-event analysis.

### 2.9 `NotificationLog` (every system-sent communication on a contract)

```csharp
public class NotificationLog {
    public long NotificationLogId { get; set; }         // PK BIGINT
    public int ContractId { get; set; }                 // FK → Contract
    public NotificationChannel Channel { get; set; }    // InAppOnly / Email
    public string RecipientUserId { get; set; }         // NVARCHAR(128) — Entra oid; never the email
    public string Subject { get; set; }                 // NVARCHAR(256)
    public NotificationStatus Status { get; set; }      // Sent / Failed / Suppressed
    public string? FailureReason { get; set; }          // NVARCHAR(512) — for ops review
    public DateTime SentAt { get; set; }
    // + audit
}
```
**Indexes:** `IX_NotificationLog_ContractId`, `IX_NotificationLog_SentAt` (for retry/ops queries).
**Cross-link:** each successful notification also produces an `ActivityEvent` row of type `NotificationSent`.

### 2.10 `ReminderSetting` (per-category reminder config — S17)

```csharp
public class ReminderSetting {
    public int ReminderSettingId { get; set; }          // PK
    public Category Category { get; set; }              // Event / Facilities / IT — unique
    public int CadenceDays { get; set; }                // 7 / 14 / 28 / 56 (UI offers 1/2/4/8 weeks)
    public string TemplateBody { get; set; }            // NVARCHAR(MAX) — supports a small merge-field set
    public bool IsEnabled { get; set; }
    // + audit
}
```
**Indexes:** unique on `Category + IsDeleted = 0`.

### 2.11 Enums (canonical — referenced by API, Web, and SQL check constraints)

`ContractStatus` carries the canonical 13 values per `solution-requirements.md` Section 4:
`InProcess`, `WithVendor`, `WithRequester`, `WithLegal`, `WithGCO`, `WithInfoSec`, `WithPrivacy`, `OutForSignature`, `Completed`, `OnHold`, `Canceled`, `Expired`, `Terminated`.
`AppRole` (used in `[Authorize(Roles="...")]`): `Procurement`, `Requester`, `AttorneyReviewer`.

---

## 3. API contracts

`[ApiController]` on every controller. Default `Cache-Control: private, no-store` middleware. RFC 7807 ProblemDetails on every error. JSON enums serialize as strings. Per `api-record-access.md`, **every read path filters in-query and every detail / mutation re-applies the access check; ownership violations return 403, never 404.**

### 3.1 Health

| Method | Path             | Auth | Body | Returns        | Notes                  |
|--------|------------------|------|------|----------------|------------------------|
| GET    | /health/live     | anon | —    | 200 `{status}` | liveness — no DB call  |
| GET    | /health/ready    | anon | —    | 200 / 503      | DB ping                |

### 3.2 Current user

| Method | Path           | Auth   | Body | Returns                                          | Notes |
|--------|----------------|--------|------|--------------------------------------------------|-------|
| GET    | /api/me        | any    | —    | 200 `{ userId, displayName, email, role, dept }` | Reflects Entra app-role membership. Powers role-aware landing redirect. |

### 3.3 Contracts

| Method | Path                                  | Auth                                                | Body                       | Returns                          | Notes |
|--------|---------------------------------------|-----------------------------------------------------|----------------------------|----------------------------------|-------|
| GET    | /api/contracts                        | `Procurement` / `Requester` / `AttorneyReviewer`    | —                          | 200 paged `ContractRowDto[]`     | Filtered server-side by role: Procurement → all non-archived; Requester → own contracts; Reviewer → assigned contracts. Filter params: `triage` (one of the chip ids), `category`, `assigneeUserId`, `query`. Default sort: `nextActionDueAt asc, attention desc`. |
| GET    | /api/contracts/archive                | `Procurement`                                       | —                          | 200 paged `ContractRowDto[]`     | Status filter: {Completed, Canceled, Expired, Terminated}. Search by name / vendor / requester / year. Powers S10. |
| GET    | /api/contracts/renewals               | `Procurement`                                       | `?windowDays=30\|60\|90\|custom&start=&end=&category=&assigneeUserId=` | 200 paged `RenewalRowDto[]` + Total | Powers S11. Days remaining derived; in-flight renewal flagged via join hint (newer contract for same vendor with overlapping term). |
| GET    | /api/contracts/renewals/export        | `Procurement`                                       | same query params          | 200 CSV / XLSX stream            | XLSX via OpenXml; streamed, never buffered. |
| GET    | /api/contracts/{contractId}           | role-aware                                          | —                          | 200 `ContractDetailDto` (role-filtered) | DTO shape varies: Procurement sees full edit set + internal-only comments; Requester sees read-only + non-internal comments; Reviewer sees all comments + comment/attach controls. Role filter is server-side per `api-record-access.md`. 403 on inaccessible row. |
| POST   | /api/contracts                        | `Requester` / `Procurement`                         | `CreateContractRequest`    | 201 `ContractDetailDto`          | Category dictates which body fields are required (see §2.2). Vendor must exist and not be Blacklisted (or Procurement override flag set). |
| PATCH  | /api/contracts/{contractId}/status    | `Procurement`                                       | `{ newStatus, note? }`     | 200 `ContractDetailDto`          | Server validates the value is one of the 13 enum values. Produces an `ActivityEvent`. No formal approval gate. |
| PATCH  | /api/contracts/{contractId}/next-due  | `Procurement`                                       | `{ nextActionDueDate? }`   | 200 `ContractDetailDto`          | Procurement sets; produces an `ActivityEvent`. |
| PATCH  | /api/contracts/{contractId}/reviewer  | `Procurement`                                       | `{ leadReviewerUserId? }`  | 200 `ContractDetailDto`          | Updates the lead reviewer; produces an `ActivityEvent`. Multi-party assignments live on `/api/contracts/{contractId}/assignments`. |
| DELETE | /api/contracts/{contractId}           | `Procurement`                                       | —                          | 204                              | Soft-delete only. |

### 3.4 Assignments (multi-party reviewer membership)

| Method | Path                                                      | Auth          | Body                            | Returns                          | Notes |
|--------|-----------------------------------------------------------|---------------|---------------------------------|----------------------------------|-------|
| GET    | /api/contracts/{contractId}/assignments                   | role-aware    | —                               | 200 `AssignmentDto[]`            | Procurement / Reviewer can read; Requester cannot. |
| POST   | /api/contracts/{contractId}/assignments                   | `Procurement` | `{ reviewerUserId, team }`      | 201                              | Creates the join row; produces an `ActivityEvent`. Idempotent — duplicate rejected with 409. |
| DELETE | /api/contracts/{contractId}/assignments/{assignmentId}    | `Procurement` | —                               | 204                              | Soft-delete; produces an `ActivityEvent`. |

### 3.5 Comments / Notes / Activity / Notifications (per-contract sub-resources)

| Method | Path                                                | Auth                    | Body                                 | Returns                  | Notes |
|--------|-----------------------------------------------------|-------------------------|--------------------------------------|--------------------------|-------|
| GET    | /api/contracts/{contractId}/comments                | role-aware              | —                                    | 200 `CommentDto[]`       | Internal-only filtered out for Requester. |
| POST   | /api/contracts/{contractId}/comments                | role-aware              | `{ text, isInternalOnly }`           | 201 `CommentDto`         | Requester can't set `isInternalOnly`. |
| GET    | /api/contracts/{contractId}/notes                   | `Procurement` / `AttorneyReviewer` | —                            | 200 `NoteDto[]`          | Notes tab — Requester-variant hides this. |
| POST   | /api/contracts/{contractId}/notes                   | `Procurement` / `AttorneyReviewer` | `{ type, date, participants, text }` | 201 `NoteDto`     | |
| PATCH  | /api/contracts/{contractId}/notes/{noteId}          | author only             | partial                              | 200                      | Edit own note. |
| DELETE | /api/contracts/{contractId}/notes/{noteId}          | author only             | —                                    | 204                      | Soft-delete. |
| GET    | /api/contracts/{contractId}/activity                | role-aware              | —                                    | 200 `ActivityEventDto[]` | Activity tab — newest-first. |
| GET    | /api/contracts/{contractId}/notifications           | `Procurement`           | —                                    | 200 `NotificationDto[]`  | Notification log. |

### 3.6 Attachments (per `api-blob-attachments.md`)

| Method | Path                                                                      | Auth                    | Body                              | Returns | Notes |
|--------|---------------------------------------------------------------------------|-------------------------|-----------------------------------|---------|-------|
| POST   | /api/contracts/{contractId}/attachment-batches                            | role-aware              | `{ }`                             | 201 `{ batchId }` | Verify ownership/access of the contract → 403 if not. |
| POST   | /api/attachments                                                          | role-aware              | streamed body + `?batchId=&contractId=` | 201 `{ attachmentId }` | Streams directly to Blob; content-type + size validated at controller. Up to 5 concurrent uploads per client. |
| POST   | /api/attachment-batches/{batchId}/complete                                | role-aware              | —                                 | 200       | Counts rows in SQL — never trusts client. Idempotent. |
| GET    | /api/contracts/{contractId}/attachments                                   | role-aware              | —                                 | 200 `AttachmentDto[]` | Soft-deleted excluded. |
| GET    | /api/attachments/{attachmentId}/content                                   | role-aware              | —                                 | 200 stream + `Content-Disposition` | `Cache-Control: private, no-store`. |
| DELETE | /api/attachments/{attachmentId}                                           | author or Procurement   | —                                 | 204       | Soft-delete; blob retained per ADR-009. |

### 3.7 Vendors

| Method | Path                              | Auth          | Body              | Returns                       | Notes |
|--------|-----------------------------------|---------------|-------------------|-------------------------------|-------|
| GET    | /api/vendors                      | `Procurement` | `?query=&type=&preferredStatus=` | 200 paged `VendorRowDto[]`  | Powers S8 master list. |
| GET    | /api/vendors/autocomplete         | any           | `?q=`             | 200 `VendorSuggestionDto[]`  | Lightweight payload — `{ vendorId, name, preferredStatus }`. Used by intake forms. |
| GET    | /api/vendors/{vendorId}           | `Procurement` | —                 | 200 `VendorSummaryDto` + recent contracts | Powers the vendor summary modal (replaces deferred S9 page). |
| POST   | /api/vendors                      | `Procurement` | `CreateVendorRequest` | 201 `VendorSummaryDto`     | Inline vendor add. Fuzzy duplicate check returns 409 with the suggested existing vendor (see ADR-010). |
| PATCH  | /api/vendors/{vendorId}           | `Procurement` | partial           | 200                           | Edit attributes / contact / notes. |

### 3.8 Bulk upload (S12)

| Method | Path                                | Auth          | Body                                  | Returns                       | Notes |
|--------|-------------------------------------|---------------|---------------------------------------|-------------------------------|-------|
| POST   | /api/bulk-upload/preview            | `Procurement` | multipart spreadsheet file (XLSX)     | 200 `BulkUploadPreviewDto`    | Parses + validates per-cell; returns valid + flagged rows. Preview state is **not** persisted server-side — see ADR-011. |
| POST   | /api/bulk-upload/commit             | `Procurement` | `{ rows: ContractDraftDto[] }`        | 201 `{ importedCount }`       | Client posts the resolved rows back. Server re-validates each before insert. Atomic per-row; failures returned alongside successes. |

### 3.9 Reminder settings (S17)

| Method | Path                              | Auth          | Body                                              | Returns                  | Notes |
|--------|-----------------------------------|---------------|---------------------------------------------------|--------------------------|-------|
| GET    | /api/reminder-settings            | `Procurement` | —                                                 | 200 `ReminderSettingDto[]` | One row per Category. |
| PUT    | /api/reminder-settings/{category} | `Procurement` | `{ cadenceDays, templateBody, isEnabled }`        | 200                      | Audited. |

### 3.10 Out-for-signature reminder loop (background)

Implemented as an `IHostedService` per `api-performance.md` — Tier 1 default, no Service Bus. Wakes every 60 minutes; selects contracts where `Status = OutForSignature`, the category's `IsEnabled = true`, and `now - LastReminderSentAt >= CadenceDays` (or no reminder yet sent for this status entry); sends per-vendor email via Microsoft Graph + creates an `ActivityEvent` + writes to `NotificationLog`. Stops on any status change. Failures log to `NotificationLog` and surface on the contract record.

### 3.11 Error contract & cache headers

- All errors: RFC 7807 ProblemDetails with plain-language `detail`. Field-level validation errors populate `errors` extension. Stack traces never surface to clients (per `api-error-handling.md`).
- Default response header: `Cache-Control: private, no-store`. Lookup endpoints (`/api/me`, autocomplete) may layer a short `max-age` but stay `private`.

---

## 4. UI sketch

**Claude Design handoff present — `/build` implements every in-scope screen against it (prototyped screens from the design's HTML, deferred screens from the blueprint; tokens and styling from the repo design system).**

The shell pattern from the prototype (`AppShell.jsx`) carries across every screen: navy McDermott sidebar with lockup at top, nav grouped as Primary / Create / More, pinned user card at bottom; sticky top bar with breadcrumb + theme toggle + avatar; main content area max-width 1200px. Mobile drawer with hamburger below 1024px (per `app-shell-and-headers.md`).

### S1 — Sign-in (Entra redirect) [deferred]
Standard Entra-hosted sign-in. On return, the API runs `EnsureUserMiddleware`; client redirects to the role-appropriate landing (`/dashboard` for Procurement, `/my-submissions` for Requester, `/my-reviews` for Reviewer). Role drives the landing — `/api/me` is the source.
**Role:** all.

### S2 — Procurement Dashboard (Active Contracts) [prototyped]
Page head with title "Active contracts", current-date subtitle, "Bulk upload" + "New contract" actions. **Triage chip strip** with six chips (All active / Needs your action / In attorney review / Awaiting signature / Expiring ≤14 days / On hold & closed), counts + colored dots. **Table** with attention-flag column, contract title + ID, vendor, category icon, stage badge, reviewer (name + team), value, expires cell, last action, next due. Sortable column headers. Empty-row filter state per `loading-empty-and-error-states.md`. Search box + result count.
**Role:** `Procurement`.

### S3 — Contract Detail (Procurement view) [prototyped]
Back link to dashboard. Header eyebrow (contract number + category), title, sub-line (vendor link + cost + status badge). **Contextual notice alert** (Unassigned / Approval-not-applicable-yet / Expiring soon / exception-state messaging). **Workflow stepper** showing the 9-step forward path with muted state for exception statuses + workflow flag. **Contextual primary CTA** ("Advance to X" / "Mark completed" / "Start renewal" / "Resume review" / "Reopen contract"). **Five tabs**: Details, Documents, Comments, Notes, Activity. **Right-rail cards**: Status (with override dropdown + hint), Action dates (last action + next-due with inline edit), Lead reviewer (with inline reassign).
**Role:** `Procurement`. The Requester (S14) and Reviewer (S16) variants are the *same backend record* — the API returns a role-filtered DTO; the front-end hides edit / status / reassign controls and (for Requester) the Notes tab and internal-only comments.

### S4 — Submit Contract — category picker [deferred]
Three large category cards (Event / Facilities / IT) with one-sentence subtitles. Muted "Not sure? Ask your Procurement contact." Choosing a card persists the category and navigates to S5/S6/S7. Category is non-editable after submission.
**Role:** `Requester` (Procurement can submit on behalf).

### S5 — IT Intake Form [prototyped]
Common fields (requester, vendor with autocomplete, contract title, total cost, term start, term end, description). IT-type toggle (Software / Professional Services). Software-only fields shown conditionally: deployment (SaaS-vendor-hosted / On-prem / Hybrid), hosting location, seats, application version/flavor, licensing type (Subscription / Perpetual / Per-User), system access, permissions, integrations. Professional-services fields shown conditionally: engagement (Fixed fee / T&M / Retainer), scope, hours, on-site Y/N. Risk-review attributes (personal data Y/N, PHI Y/N, uses AI Y/N) always shown. Attachment area. Submit blocked if any required category-specific field is missing. Blacklisted vendor blocks Requester submit (Procurement can override with reason).
**Role:** `Requester` / `Procurement` on behalf.

### S6 — Event Intake Form [deferred]
Common fields + event-only: event date, venue location, part-of-larger-event flag, parent event name. Helper text under cost field: "Use the cost for this engagement only — not the whole conference." Same submission rules as S5.
**Role:** `Requester` / `Procurement`.

### S7 — Facilities Intake Form [deferred]
Common fields + facilities-only: service description (free text), term dates. Same submission rules as S5.
**Role:** `Requester` / `Procurement`.

### S8 — Vendor Master List [prototyped]
Sortable / searchable table: name, type (Event Venue / Facilities Service / Software / Professional Services), preferred-status badge, primary contact, contract count. "Add vendor" action surfaces an inline form (autocomplete check against existing vendors; fuzzy duplicate prompts merge). Clicking a row opens the **vendor summary modal** (replaces deferred S9): status badge, vendor-since, contact details, notes, list of contracts (each clickable through to S3).
**Role:** `Procurement`.

### S10 — Archive View [deferred]
Same column set as S2, filtered server-side to `{Completed, Canceled, Expired, Terminated}`. Adds search box (name / vendor / requester) + year selector. No "+ New" / "Bulk Upload" actions. Reopening a record (status change back to an active state) requires Procurement confirmation modal.
**Role:** `Procurement`.

### S11 — Renewal Report [deferred]
Window picker (30 / 60 / 90 days; custom range). Filter by category + lead reviewer. Table: contract, vendor, end date, days remaining, current status, "Renewal in flight" flag where applicable. Export buttons (CSV / XLSX) — server streams.
**Role:** `Procurement`.

### S12 — Bulk Upload — Preview & Fix [prototyped]
Two-step: (1) drop zone for `.xlsx` (drag-and-drop + file picker); on upload the server returns a preview with per-cell errors. (2) Preview table with the schema columns (Contract title / Vendor / Category / Value / Term start / Term end); flagged cells render an inline editor; row-level "skip" toggles; commit button blocked until every flagged row is resolved (fixed or skipped). On commit the client POSTs the resolved drafts; toast confirms count; dashboard refresh.
**Role:** `Procurement`.

### S13 — My Submitted Contracts (Requester home) [deferred]
Read-only worklist scoped to the signed-in Requester. Columns: contract title, vendor, current status, lead reviewer, last action date. Row click → S14. "+ New contract" CTA in the page head → S4.
**Role:** `Requester`.

### S14 — Contract Detail — Requester variant [deferred]
Same record as S3 with role-filtered DTO: status / reassign / field-edit / Notes-tab controls hidden; internal-only comments filtered server-side; document attachment + comment-add available. Workflow stepper visible (read-only).
**Role:** `Requester` (own contracts only).

### S15 — My Assigned Contracts (Reviewer home) [deferred]
Worklist scoped to contracts where the signed-in user is on the assignment list. Columns: contract, vendor, status, last action. Row click → S16.
**Role:** `AttorneyReviewer`.

### S16 — Contract Detail — Reviewer variant [deferred]
Same record as S3 with status / reassign hidden; comment-add + attachment-add available; all comments visible. Workflow stepper read-only.
**Role:** `AttorneyReviewer` (assigned contracts only).

### S17 — Reminder Configuration [deferred]
Per-category card grid (Event / Facilities / IT). Each card: cadence selector (1 / 2 / 4 / 8 weeks), template editor (textarea with `{contractName}` / `{vendorName}` / `{requesterName}` merge tags), on/off toggle. Save persists per category. Read-only summary at top: "Reminders fire only while status is `Out for signature` and stop on any other status change."
**Role:** `Procurement`.

### S18 — User Profile / Settings [deferred]
Read-only: name, email, role. Editable: notification preference (in-app + email vs. in-app only).
**Role:** all.

### Cross-cutting (apply to every screen)

- Status pill uses the McDermott badge pattern; "On hold" maps to the `mws-badge--hold` extension recorded in the blueprint.
- Vendor name on Procurement surfaces opens the vendor summary modal; on Requester / Reviewer surfaces it renders as plain text.
- "Requester" is the canonical spelling — `/build` normalizes the prototype's "Requestor" labels on implementation.
- Every screen renders all three non-data states (loading skeleton / error / empty) per `web-component-architecture.md`.
- Tweaks panel from the prototype is **not** carried into production (prototype-only meta tool).
- Theme toggle is real and lives in the top bar.

---

## 5. Auth + observability plan

- **Entra app registration:** single-tenant. App roles: `Procurement`, `Requester`, `AttorneyReviewer`. App-role assignment is the source of truth for both SPA and API authorization. Per `api-client-auth.md`: the SPA is registered as a **SPA platform** (not public client); the API is **Web**; redirect URIs include both trailing-slash and no-trailing-slash variants for every local dev port plus the App Service URL; `isFallbackPublicClient` stays `false`; cross-origin token redemption follows the standard SPA flow.
- **MSAL config:** `@azure/msal-browser` + `@azure/msal-react`; authority `https://login.microsoftonline.com/<tenant-id>`; `clientId` and `redirectUri` from env (non-secret); token cache in `sessionStorage`. `scope` is `api://<api-app-id>/.default`. The SPA never carries a client secret. On 401 from the API the SPA falls back to `acquireTokenRedirect`.
- **API token validation:** `Microsoft.Identity.Web`. `[Authorize]` on every controller (only `/health/live` and `/health/ready` are anonymous). AFD-FDID middleware no-op'd until prod hosts the API behind Azure Front Door.
- **User provisioning:** `EnsureUserMiddleware` (per-replica `ConcurrentDictionary<Guid, byte>` cache) upserts `dbo.Users` on first authenticated request; best-effort; reads `oid` / `name` / `preferred_username` from the JWT. Clients never call a "register" endpoint.
- **Record access (per `api-record-access.md`):**
  - Lists: filter in-query by role+ownership+assignment OR.
  - Detail / mutations: re-apply check on every read path; 403 on inaccessible row.
  - Access source is app-managed only — `RequesterUserId` / `ContractAssignment.ReviewerUserId` / Procurement role membership. No external client-matter lookup.
- **Logging:** Serilog → Console + Application Insights via `APPLICATIONINSIGHTS_CONNECTION_STRING`. `UserId` (Entra `oid` — pseudonymous per `api-logging.md`) and `OperationId` are required structured properties on every log entry. OperationId middleware is the first pipeline item; the header `X-Operation-Id` echoes on every response. Never log contract content, comment bodies, note bodies, file content, vendor terms, or anything that could identify a person beyond `UserId`. PII rules per `api-pii-handling.md`.
- **Telemetry events (≤5):** `ContractSubmitted` (Category, RequesterRole-snapshot, ITSubtype if IT), `StatusChanged` (from → to), `BulkUploadCommitted` (rowCount, failureCount), `ReminderSent` (Category, succeeded/failed), `LoginSucceeded` (Role).

---

## 6. Security plan

- **A01 Broken access control —** `[Authorize(Roles="...")]` on every controller; record-level checks per `api-record-access.md` re-applied on detail + every mutation; 403, never 404; field-level filtering server-side for Requester/Reviewer DTOs.
- **A02 Cryptographic failures —** All secrets in Key Vault (only one: the Microsoft Graph application secret for outbound email — if Graph App permissions are used; otherwise delegated and no secret needed). TLS via App Service. Connection strings use Managed Identity (no passwords).
- **A03 Injection —** EF Core LINQ for single-table operations; stored procedures called via `ExecuteSqlInterpolatedAsync` for everything else (per `api-data-access.md`); never `ExecuteSqlRawAsync` with concatenation. Bulk-upload preview re-validates server-side before insert. `JsonSerializerOptions.UnmappedMemberHandling = Disallow` on every controller.
- **A04 Insecure design —** No formal approval gating shortcuts the 13-status workflow; Procurement is the authoritative status mover. Soft-delete only — no hard-delete path. Vendor Blacklisted attribute checked at intake submission.
- **A05 Security misconfig —** Strict CSP per `api-performance.md` (`default-src 'none'; frame-ancestors 'none'`); `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; HSTS. Swagger off in prod (gated by `Swagger:Enabled`, not `IsDevelopment`).
- **A06 Vulnerable components —** SonarCloud SAST + Gitleaks + `npm audit` + `dotnet list package --vulnerable` wired in CI per `ci-pipeline.md`.
- **A07 Identification/auth —** `Microsoft.Identity.Web` validates JWTs; no custom parsing. App role membership drives `[Authorize(Roles="...")]`.
- **A08 Software / data integrity —** Key Vault + Managed Identity; build runs in CI; no runtime code download. Migrations applied manually dev → staging → prod per `database-migrations.md`.
- **A09 Logging / monitoring —** Serilog + App Insights + `OperationId` + `UserId` (Entra oid only). Never log content. App role + status changes + bulk imports captured as telemetry.
- **A10 SSRF —** Outbound calls only to Microsoft Graph (mail send) and Azure SQL / Blob / Key Vault (Managed Identity). No user-controlled URLs are fetched. Intake / bulk-upload spreadsheets are parsed in-memory; not de-referenced.

---

## 7. Out of scope

**Tier 1 hard limits (out by gate):**
- Document **processing** — extraction, OCR, chunking, embeddings, vector search, RAG, conversation history grounded on contracts. (Basic file attachments — upload/list/download/delete — are in scope per `api-blob-attachments.md`.)
- Service Bus workers / queue-driven async (reminders are in-process via `IHostedService`).
- External client-matter / ethical-wall access. Row visibility is app-managed only.
- External-audience surface — clients, opposing counsel, public web.

**Product scope deferrals (out by analyst sign-off):**
- **iManage integration** (document storage / version control). Deferred for POC; the data model and document handling are structured so it can be added later (ADR-007).
- **SpendConnect integration** (reporting feed). Deferred for POC; replaced by the bulk-upload migration + in-product reporting (S11). Architecture is additive-compatible.
- **Software license entitlement tracking** — explicitly out per `solution-requirements.md` Section 6.
- **Vendor Detail page (S9 from the prior blueprint)** — dropped at the design-code-handoff checkpoint; the vendor summary modal on S8 covers it.
- **Per-contract reminder cadence override** — settings are per-category for v1; per-contract override is a future enhancement (recorded in `decisions.md` ADR-013 if it changes).
- **Email-to-intake** — Requesters use the web form, not an email shortcut.

---

## 8. Open questions

1. **Notification channel (carries over from blueprint open Q5).** POC plan is **Microsoft Graph** mail send via Managed Identity with `Mail.Send` app permission scoped to a no-reply mailbox. Confirm with InfoSec/IT before build wires it. If declined, fall back to in-app log only and surface to Procurement to manually email; capture in ADR-014.
2. **Vendor de-duplication threshold (carries over from blueprint open Q6).** Recommend a normalized-name comparison (strip case, punctuation, "Inc"/"LLC"/"Ltd" suffixes) plus a Jaro-Winkler similarity ≥ 0.92 as the merge-prompt trigger. Manual confirmation per match. Confirm with Lisa during build.
3. **Bulk-upload error tolerance ceiling.** Should we hard-block commit when more than 50% of rows have errors (force the user to re-upload a cleaner spreadsheet)? Recommendation: yes, with override checkbox + reason.
4. **Reviewer team taxonomy.** Procurement records a `ReviewerTeam` string per assignment (Privacy / InfoSec / GCO / Legal / Litigation / Corporate). Should this be a free-text field or a fixed enum? Recommend an enum with an "Other" escape hatch.
5. **Pending requirements fields (carried from the brief).** Analyst owner name, Lisa Farkas's title, executive sponsor, end-user counts per role, approver names (InfoSec lead, Privacy lead), timeline target dates. None block the build, but fill them in `solution-requirements.md` Section 2 / Section 8 / Section 9 when known.

---

*This plan covers every requirement in `solution-requirements.md` and every screen in `full-design-blueprint.md` (17 in-scope screens; S9 dropped at design-code-handoff). Every non-default architectural decision is recorded in `decisions.md` alongside this file.*
