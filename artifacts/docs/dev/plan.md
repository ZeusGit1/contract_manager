# Contract Manager — Tier 1 Plan (v2.0 parallel review lanes)

**Sensitivity:** Confidential by default; Privileged for any contract routed through Legal / GCO; PII present (vendor contacts, requester / reviewer identities, signers). See `solution-requirements.md` Section 4 / Section 10 for the full handling rules.
**Users:** Procurement team (4 named owners — Lisa Farkas, Marcus Webb, Lauren Pike, Tom Reyes); ~50 Attorney Reviewers across Privacy / InfoSec / GCO / Legal; firm-wide Requesters (any firm employee). Peak concurrent users well under the Tier 1 ceiling — the active dashboard population is the small Procurement team.
**Stack:** React 19 + TS + Vite (web); ASP.NET Core 10 controllers + EF Core + Microsoft.Identity.Web (api); SQL Server (db); Azure App Service + Azure SQL hosting.
**Time budget:** ~6–8 focused hours — Phase 1 covers 18 routes across three roles (one of which, S15 Renewals, is a Coming Soon stub per ADR-038) plus a four-flow bulk-upload pipeline and a data-driven categories admin (UI gated by a feature flag per ADR-037). The web layer is already migrated to v2.0 (see `web/src/types/phase1.ts`); the API + DB need to follow.

> **Design handoff present** at `artifacts/docs/design/project/`. The bundle's HTML/JSX is the **v1.0 linear-status prototype** and is stale relative to the brief's v2.0 parallel-lanes pivot (commit `efd2d8b`, 2026-06-22). The blueprint at `artifacts/docs/design/full-design-blueprint.md` is likewise stale (still describes the 13-status enum). **Authoritative sources for v2.0 visual + structural decisions are, in order: (1) the brief (`solution-requirements.md` v2.0), (2) the paste-ready companion at `artifacts/docs/product/complete-functional-requirements.md`, (3) the live React implementation under `web/src/` (rebuilt for v2.0 in commit `efd2d8b` — the de-facto approved prototype), and (4) the approved demo HTML at `artifacts/demo/Contract-Manager-Demo.html`.** Tokens and component styling always come from the repo design system (`.claude/rules/design/`) regardless. The v1.0 bundle stays in `artifacts/docs/design/project/` only as historical context — `/build` does NOT implement against it. See ADR-033.

---

## 1. Tier 1 gate confirmation

- [x] **Named group of ≤ ~100 concurrent firm users:** 4 Procurement owners + ~50 Attorney Reviewers + firm-wide Requesters; observed peak well under the 100-user ceiling.
- [x] **Single-tenant Entra, app roles for authorization:** four roles — `Procurement`, `ProcurementAdmin`, `Requester`, `AttorneyReviewer`. `ProcurementAdmin` is layered on top of `Procurement` (an admin is also a Procurement owner) and is the only role that can mutate `Category` / `CategoryField`. App-role membership maps directly to `[Authorize(Roles="...")]` per `api-record-access.md`.
- [x] **Row access is app-managed, not external client-matter:** Procurement role sees all non-archived contracts (role-wide); Requester sees contracts where they are the `RequesterUserId` (ownership); Attorney Reviewer sees contracts where they appear in `ContractAssignment` (in-app assignment). Composes as OR per the rule file. **No client/matter system is consulted.** The brief is explicit in §6 ("Will not derive access from any external client-matter / ethical-wall system") and §10.5.
- [x] **Azure App Service + Azure SQL hosting:** standard Tier 1 stack; LocalDB for dev.
- [x] **No doc processing / workers / vector search / external audience:** contracts and supporting documents are stored as Blob attachments via `api-blob-attachments.md`; the app never reads *into* a file. No Service Bus. No extraction, OCR, embeddings, or RAG. Phase 1 logs reminder intent only — no automatic outbound mail loop (full email send deferred per brief §6 / UC4). Audience is internal firm staff. Vendor and DocuSign envelope are **lanes, not users** (per §10.11) — no external-audience surface created.

---

## 2. Data model

Twelve entities. Every table carries the six mandatory audit columns (`CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `DeletedAt`) — abbreviated below as `// + audit`. **Soft-delete only — retention in perpetuity** (brief §6, §10.7). Identifier columns referenced in logs follow `api-logging.md`: only the Entra `oid` (`UserId`) is permitted; never email or display name. EF Core query filters apply `IsDeleted = 0` on every soft-deletable entity.

### 2.1 `Vendor`

```csharp
public class Vendor {
    public int VendorId { get; set; }                  // PK
    public string VendorCode { get; set; }              // optional external code, e.g. V-0001 from seed
    public string Name { get; set; }                    // NVARCHAR(256)
    public VendorType Type { get; set; }                // EventVenue / FacilitiesService / Software / ProfessionalServices
    public PreferredStatus PreferredStatus { get; set; }// Preferred / Standard / Difficult / Blacklisted
    public string? PrimaryContactName { get; set; }     // NVARCHAR(256)
    public string? PrimaryContactEmail { get; set; }    // NVARCHAR(320)
    public string? PrimaryContactPhone { get; set; }    // NVARCHAR(64)
    public string? PrimaryContactRole { get; set; }     // NVARCHAR(128)
    public string? Location { get; set; }               // NVARCHAR(256)
    public string? VendorSinceText { get; set; }        // NVARCHAR(32) — display only
    public string? Notes { get; set; }                  // NVARCHAR(MAX)
    // + audit
}
```
**Indexes:** filtered unique on `Name + IsDeleted=0` (active-vendor uniqueness), `IX_Vendor_PreferredStatus`.
**Check constraints:** `CK_Vendor_Type`, `CK_Vendor_PreferredStatus`.

### 2.2 `Contract`

The **header** for a contract. Lane state lives in `ContractLane` (§2.3) — there is **no** linear-status column on this table.

```csharp
public class Contract {
    public int ContractId { get; set; }                       // PK
    public string ContractNumber { get; set; }                // NVARCHAR(24) — display ID, e.g. CTR-2026-0142; unique
    public string Title { get; set; }                         // NVARCHAR(256)
    public Category Category { get; set; }                    // Event / Facilities / IT (validated against Category table — see §2.4)
    public OverallStatus OverallStatus { get; set; }          // active / completed / canceled
    public Priority Priority { get; set; }                    // low / medium / high / critical — default medium
    public int VendorId { get; set; }                         // FK → Vendor
    public Guid RequesterUserId { get; set; }                 // FK → User (Entra oid)
    public string RequesterEmail { get; set; }                // NVARCHAR(320) — snapshot at submit; used for reminder display
    public Guid? ProcurementOwnerUserId { get; set; }         // FK → User — Procurement-side owner
    public decimal? TotalCostUsd { get; set; }                // DECIMAL(18,2)
    public DateTime SubmittedAt { get; set; }
    public DateTime? TermStartDate { get; set; }
    public DateTime? TermEndDate { get; set; }
    public DateTime LastActionAt { get; set; }                // updated by every status/lane change / activity event
    public string? Description { get; set; }                  // NVARCHAR(MAX)
    // Event-only (nullable):
    public string? EventName { get; set; }                    // NVARCHAR(256)
    public DateTime? EventDate { get; set; }
    public string? VenueLocation { get; set; }                // NVARCHAR(256)
    public string? ParentEventName { get; set; }              // NVARCHAR(256)
    // Facilities-only (nullable):
    public string? Building { get; set; }                     // NVARCHAR(256)
    public string? ServiceDescription { get; set; }           // NVARCHAR(MAX)
    // IT-only (nullable):
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
**Indexes:** `IX_Contract_VendorId`, `IX_Contract_RequesterUserId`, `IX_Contract_ProcurementOwnerUserId`, filtered `IX_Contract_OverallStatus_Active` (where `OverallStatus = 'active'` — dashboard hot path), `IX_Contract_Category_Priority`, `IX_Contract_TermEndDate`, `IX_Contract_LastActionAt`.
**Check constraints:** `CK_Contract_OverallStatus`, `CK_Contract_Priority`, `CK_Contract_Category`, `CK_Contract_ITType`, `CK_Contract_LicensingType`, `CK_Contract_CloudOrOnPrem`. Plus conditional `CK_Contract_CategoryShape` enforcing that category-specific fields are populated only when category matches (e.g., `EventDate` only when `Category = Event`).
**Unique constraint:** filtered unique on `ContractNumber + IsDeleted=0`.

### 2.3 `ContractLane` — parallel review lanes (the v2.0 core)

The unit of state. Every contract has **exactly nine rows** in this table — one per lane. Rows are created at intake in a single INSERT batch; the Procurement lane defaults to `in_review`, the other eight to `not_started`. `ContractLane` is **not** soft-deleted — absence of a lane would break the invariant; cancellation/N-A is absorbed by the `Status` enum.

```csharp
public class ContractLane {
    public int ContractLaneId { get; set; }            // PK
    public int ContractId { get; set; }                // FK → Contract
    public LaneId LaneId { get; set; }                 // procurement / legal / infosec / privacy / gco / vendor / requester / signature / filed
    public LaneStatus Status { get; set; }             // not_started / in_review / waiting / approved / canceled / na / complete
    public Guid? OwnerUserId { get; set; }             // FK → User — nullable; internal lanes only
    public string? OwnerLabel { get; set; }            // NVARCHAR(256) — free-text for external lanes ("Relativity ODA LLC", "DocuSign envelope #4421") — never logged
    public DateTime? DueDate { get; set; }
    public DateTime LastUpdated { get; set; }
    public string? Note { get; set; }                  // NVARCHAR(MAX) — never logged
    // audit columns present but DeletedAt unused
}
```
**Indexes:** `IX_ContractLane_ContractId` (every detail screen fetches all 9 lanes by contract), unique on `(ContractId, LaneId)` (one row per lane per contract), filtered `IX_ContractLane_Open_Owner` on `(OwnerUserId, ContractId)` where `Status IN ('in_review','waiting')` — powers "My active lanes" queries.
**Check constraints:** `CK_ContractLane_LaneId`, `CK_ContractLane_Status`. Plus `CK_ContractLane_OwnerShape` — internal lanes (`procurement`, `legal`, `infosec`, `privacy`, `gco`, `filed`) may set `OwnerUserId` and must leave `OwnerLabel` null; external lanes (`vendor`, `requester`, `signature`) leave `OwnerUserId` null and may set `OwnerLabel`.

### 2.4 `Category` + `CategoryField` + `ContractFieldValue` (data-driven categories admin)

```csharp
public class Category {
    public int CategoryId { get; set; }                // PK
    public string Code { get; set; }                   // NVARCHAR(32) — unique; e.g. "Event"
    public string Label { get; set; }                  // NVARCHAR(64) — display name
    public string IconKey { get; set; }                // NVARCHAR(64) — Phosphor icon name
    public int SortOrder { get; set; }
    public bool IsSystemDefined { get; set; }          // TRUE for Event/Facilities/IT (seeded); FALSE for admin-added
    public bool IsActive { get; set; }
    // + audit
}

public class CategoryField {
    public int CategoryFieldId { get; set; }           // PK
    public int CategoryId { get; set; }                // FK → Category
    public string FieldKey { get; set; }               // NVARCHAR(64) — stable identifier, e.g. "eventDate"
    public string Label { get; set; }                  // NVARCHAR(128)
    public CategoryFieldType Type { get; set; }        // text / date / select / radio / yn / number
    public string? HelperText { get; set; }            // NVARCHAR(512)
    public string? OptionsJson { get; set; }           // NVARCHAR(MAX) — JSON array of strings for select/radio
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
    public bool IsSystemDefined { get; set; }          // TRUE for fields backed by a typed Contract column; FALSE for admin-added
    public bool IsActive { get; set; }
    // + audit
}

public class ContractFieldValue {
    public int ContractFieldValueId { get; set; }      // PK
    public int ContractId { get; set; }                // FK → Contract
    public int CategoryFieldId { get; set; }           // FK → CategoryField (type lives there)
    public string FieldKey { get; set; }               // NVARCHAR(64) — denormalized from CategoryField for query convenience
    public string? ValueText { get; set; }             // NVARCHAR(MAX) — canonical wire form; parsed per CategoryField.Type by the service
    // + audit
}
```
**Indexes:**
- `Category`: filtered unique on `Code + IsDeleted=0`.
- `CategoryField`: filtered unique on `(CategoryId, FieldKey) + IsDeleted=0`; ordered by `SortOrder` on read.
- `ContractFieldValue`: unique filtered on `(ContractId, CategoryFieldId) + IsDeleted=0` (one value per contract per admin field); `IX_ContractFieldValue_FieldKey` for cross-contract queries on a named admin field.

**Check constraints:** `CK_CategoryField_Type`. **JSON shape validation** of `OptionsJson` lives in the service (controllers reject malformed input — never raw SQL on the column).

> **Hybrid storage decision (split system / admin — ADR-031, supersedes prior ADR-031 framing per ADR-037).**
> - **System-defined categories** (Event / Facilities / IT — seeded with `IsSystemDefined = true`) and their **system-defined fields** (`EventDate`, `VenueLocation`, `Building`, `ITType`, etc., also `IsSystemDefined = true`) write values to the **typed columns on `Contract`** (§2.2). Type safety, indexability, and every QA acceptance criterion in the brief target these named fields.
> - **Admin-added categories** (`IsSystemDefined = false`) and **admin-added fields on any category** (`IsSystemDefined = false`) write values to `ContractFieldValue`. The value lives in `ValueText`, parsed by the service layer per `CategoryField.Type`. Cross-contract queries on a named admin field are still possible via `FieldKey`-indexed reads.
> - The data model supports admin-defined categories and fields **at all times**. The `categoriesAdminEnabled` **feature flag** controls whether the **admin management UI + write endpoints** are exposed — not whether the data model functions (ADR-037). Phase 1 ships with the flag **off**; the model is in place so flipping the flag later does not require schema change.

### 2.5 `User`

```csharp
public class User {
    public Guid UserId { get; set; }                  // PK — Entra oid
    public string DisplayName { get; set; }           // NVARCHAR(256) — never logged
    public string Email { get; set; }                 // NVARCHAR(320) — never logged
    public string? Department { get; set; }           // NVARCHAR(128)
    public DateTime FirstSignInAt { get; set; }
    // + audit
}
```
**Indexes:** filtered unique on `Email + IsDeleted=0`. Provisioning per `api-auth.md` — `EnsureUserMiddleware` upserts on first authenticated request.

### 2.6 `ContractAssignment` — Attorney Reviewer ↔ Contract membership

```csharp
public class ContractAssignment {
    public int ContractAssignmentId { get; set; }      // PK
    public int ContractId { get; set; }                // FK → Contract
    public Guid ReviewerUserId { get; set; }           // FK → User
    public ReviewerTeam ReviewerTeam { get; set; }     // enum — Privacy / InfoSec / GCO / Legal / Litigation / Corporate / Other (ADR-036)
    public DateTime AssignedAt { get; set; }
    public Guid AssignedByUserId { get; set; }         // FK → User — Procurement member
    // + audit
}
```
**Indexes:** `IX_ContractAssignment_ContractId`, `IX_ContractAssignment_ReviewerUserId`; filtered unique on `(ContractId, ReviewerUserId) + IsDeleted=0`.

> Assignment grants the reviewer **read + comment/attach** on a specific contract. Lane state on the four reviewer lanes is still mutated only by Procurement (brief §10.11, complete-functional-requirements §6.17). The assignment table is therefore the row-access source, not the lane-update gate.

### 2.7 `ContractComment` (running internal stream — Comments tab)

```csharp
public class ContractComment {
    public int ContractCommentId { get; set; }          // PK
    public int ContractId { get; set; }                 // FK → Contract
    public Guid AuthorUserId { get; set; }              // FK → User
    public string AuthorRoleSnapshot { get; set; }      // NVARCHAR(64)
    public string Text { get; set; }                    // NVARCHAR(MAX) — never logged
    public bool IsInternalOnly { get; set; }            // hidden from Requester variant
    // + audit
}
```
**Indexes:** `IX_ContractComment_ContractId`.

### 2.8 `ContractNote` (typed discussion log — Notes tab)

```csharp
public class ContractNote {
    public int ContractNoteId { get; set; }             // PK
    public int ContractId { get; set; }                 // FK → Contract
    public Guid AuthorUserId { get; set; }              // FK → User
    public NoteType Type { get; set; }                  // Meeting / Call / Email / Note
    public DateTime NoteDate { get; set; }              // DATE
    public string? Participants { get; set; }           // NVARCHAR(512) — never logged
    public string Text { get; set; }                    // NVARCHAR(MAX) — never logged
    // + audit
}
```
**Indexes:** `IX_ContractNote_ContractId`. Check constraint `CK_ContractNote_Type`.

### 2.9 `ContractAttachment` + `ContractAttachmentBatch` (per `api-blob-attachments.md`)

```csharp
public class ContractAttachment {
    public int ContractAttachmentId { get; set; }       // PK
    public Guid AttachmentGuid { get; set; }            // opaque blob name; written before upload
    public int ContractId { get; set; }                 // FK → Contract
    public int? BatchId { get; set; }                   // FK → ContractAttachmentBatch (nullable for single-file uploads)
    public string BlobPath { get; set; }                // NVARCHAR(512) — exact path; SQL is authoritative
    public string FileName { get; set; }                // NVARCHAR(256) — original, sanitized
    public string ContentType { get; set; }             // NVARCHAR(128)
    public long SizeBytes { get; set; }
    public AttachmentStatus Status { get; set; }        // Pending / Stored / Failed (terminal on return)
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
**Indexes:** `IX_ContractAttachment_ContractId`, `IX_ContractAttachment_BatchId`, `IX_ContractAttachmentBatch_ContractId`. Single Blob container per the rule file; flat layout with `AttachmentGuid` as the opaque key. Blob name shape recorded in ADR-008.

### 2.10 `ActivityEvent` (Activity tab + audit trail)

```csharp
public class ActivityEvent {
    public long ActivityEventId { get; set; }           // PK BIGINT
    public int ContractId { get; set; }                 // FK → Contract
    public Guid ActorUserId { get; set; }               // FK → User
    public ActivityType Type { get; set; }              // LaneStatusChanged / LaneOwnerChanged / LaneNoteUpdated / LaneDueDateChanged
                                                        // OverallStatusChanged / CommentAdded / NoteAdded / AttachmentAdded
                                                        // ReminderLogged / BulkImported / AssignmentAdded / AssignmentRemoved / CategoryUpdated
    public string DescriptionLine { get; set; }         // NVARCHAR(512) — denormalized display ("Legal lane → In review")
    public string? StructuredJson { get; set; }         // NVARCHAR(MAX) — laneId, from/to status, etc. — no PII
    public DateTime OccurredAt { get; set; }
    // audit columns present but DeletedAt unused — events are append-only
}
```
**Indexes:** `IX_ActivityEvent_ContractId_OccurredAt`.

### 2.11 `NotificationLog` (reminder + system-sent communication log)

```csharp
public class NotificationLog {
    public long NotificationLogId { get; set; }         // PK BIGINT
    public int ContractId { get; set; }                 // FK → Contract
    public LaneId TargetLaneId { get; set; }            // vendor / requester / signature (external lanes only)
    public NotificationChannel Channel { get; set; }    // InAppLogOnly / Email
    public string? RecipientLabel { get; set; }         // NVARCHAR(512) — vendor name / DocuSign envelope ref — never logged
    public string? RecipientEmail { get; set; }         // NVARCHAR(320) — requester email shown in modal — never logged
    public string Subject { get; set; }                 // NVARCHAR(256)
    public NotificationStatus Status { get; set; }      // Logged / Sent / Failed / Suppressed
    public string? FailureReason { get; set; }          // NVARCHAR(512)
    public DateTime SentAt { get; set; }
    // + audit
}
```
**Indexes:** `IX_NotificationLog_ContractId`, `IX_NotificationLog_SentAt`. Every row emits a paired `ActivityEvent: ReminderLogged`.

> **Phase 1 default is `Channel = InAppLogOnly` and `Status = Logged`.** Brief §6 / §10.12 and UC4 are explicit: Phase 1 *logs* reminder intent + recipient; full email send is a build-time decision per `api-performance.md`. The schema accepts the Email channel additively when the firm confirms (open question §8).

### 2.12 Enums (canonical — referenced by API, Web, and SQL check constraints)

| Enum | Values | Notes |
|---|---|---|
| `LaneId` | `procurement`, `legal`, `infosec`, `privacy`, `gco`, `vendor`, `requester`, `signature`, `filed` | 9 values; ordered as listed. |
| `LaneStatus` | `not_started`, `in_review`, `waiting`, `approved`, `canceled`, `na`, `complete` | 7 values. **`in_review ∪ waiting` is the canonical "active" set.** |
| `OverallStatus` | `active`, `completed`, `canceled` | Procurement lane → `complete` flips overall → `completed`; explicit cancel sets `canceled`. |
| `Priority` | `low`, `medium`, `high`, `critical` | Default `medium`. Visual treatment per brief §5: critical = saturated `--color-error`, high = `--color-pale-orange`, medium = `--color-pale-gold`, low = transparent + border. |
| `AppRole` | `Procurement`, `ProcurementAdmin`, `Requester`, `AttorneyReviewer` | `ProcurementAdmin` ⊃ `Procurement` for authorization composition. |
| `ReviewerTeam` | `Privacy`, `InfoSec`, `GCO`, `Legal`, `Litigation`, `Corporate`, `Other` | Fixed enum (ADR-036). `Other` is the escape hatch for unanticipated teams. Backed by `CK_ContractAssignment_ReviewerTeam`. |
| `Category` | (data-driven via §2.4) | Phase 1 ships `Event`, `Facilities`, `IT`. |
| `VendorType` | `EventVenue`, `FacilitiesService`, `Software`, `ProfessionalServices` | |
| `PreferredStatus` | `Preferred`, `Standard`, `Difficult`, `Blacklisted` | Blacklisted blocks Requester intake submit (Procurement override allowed with reason). |
| `ITType` | `Software`, `ProfessionalServices` | |
| `LicensingType` | `Subscription`, `Perpetual`, `PerUser` | |
| `Hosting` | `Cloud`, `OnPremise`, `Hybrid` | |
| `NoteType` | `Meeting`, `Call`, `Email`, `Note` | |
| `AttachmentStatus` | `Pending`, `Stored`, `Failed` | |
| `BatchStatus` | `Pending`, `InProgress`, `Complete` | |
| `ActivityType` | (see §2.10) | Append-only — new types added at the end. |
| `NotificationChannel` | `InAppLogOnly`, `Email` | Phase 1 default `InAppLogOnly`. |
| `NotificationStatus` | `Logged`, `Sent`, `Failed`, `Suppressed` | |
| `CategoryFieldType` | `text`, `date`, `select`, `radio`, `yn`, `number` | |

### 2.13 Invariants worth restating

- **Active counting.** `in_review ∪ waiting` only. `not_started`, `approved`, `complete`, `canceled`, `na` are **never** counted active. Applies to every counter — dashboard tiles, contract row pills, reports KPIs.
- **Procurement lane → `complete` is the only path that flips `OverallStatus` to `completed`.** Setting any other lane to `complete` does not close the contract.
- **Cancellation is an overall-contract action**, not a lane action. The UI can set `OverallStatus = canceled` directly; lane statuses are not derived from that flip.
- **External lanes are never user-owned.** `vendor`, `requester`, `signature` carry only an `OwnerLabel` string. The `requester` lane's recipient email comes from `Contract.RequesterEmail` (snapshotted at intake), surfaced in the reminder modal.
- **Lane updates are Procurement-only**, regardless of caller's record-level access.

---

## 3. API contracts

`[ApiController]` on every controller. Default `Cache-Control: private, no-store` middleware. RFC 7807 ProblemDetails on every error. JSON enums serialize as strings (`JsonStringEnumConverter` per `api-coding-standards.md`). Per `api-record-access.md`, **every read path filters in-query and every detail / mutation re-applies the access check; ownership violations return 403, never 404.**

### 3.1 Health

| Method | Path             | Auth | Body | Returns        | Notes                  |
|--------|------------------|------|------|----------------|------------------------|
| GET    | /health/live     | anon | —    | 200 `{status}` | liveness — no DB call  |
| GET    | /health/ready    | anon | —    | 200 / 503      | DB ping                |

### 3.2 Current user

| Method | Path           | Auth   | Body | Returns                                                          | Notes |
|--------|----------------|--------|------|------------------------------------------------------------------|-------|
| GET    | /api/me        | any    | —    | 200 `{ userId, displayName, email, roles[], department }`        | Reflects Entra app-role membership. Drives role landing redirect. `roles` is an array — a user may be both `Procurement` and `ProcurementAdmin`. |

### 3.3 Contracts (lists + header CRUD)

| Method | Path                                    | Auth                                                | Body                       | Returns                          | Notes |
|--------|-----------------------------------------|-----------------------------------------------------|----------------------------|----------------------------------|-------|
| GET    | /api/contracts                          | `Procurement` / `Requester` / `AttorneyReviewer`    | —                          | 200 paged `ContractRowDto[]`     | Server-side role filter: Procurement → all active contracts (or all when `view=master`); Requester → own; Reviewer → assigned. Query params: `view` (`mine` \| `master` \| `submissions` \| `reviews`), `category`, `priority`, `procurementOwnerUserId`, `query` (free text), `paging`. Row DTO carries the 9 lane summary pills + active-count derived field. |
| GET    | /api/contracts/archive                  | `Procurement`                                       | —                          | 200 paged `ContractRowDto[]`     | `OverallStatus ∈ {completed, canceled}`. Searchable on name / vendor / requester / year. |
| GET    | /api/contracts/{contractId}             | role-aware                                          | —                          | 200 `ContractDetailDto` (role-filtered) | DTO shape varies by role: Procurement → full edit + internal comments + notes + lanes editable; Requester → read-only header + non-internal comments + lanes read-only + Notes hidden; Reviewer → read-only header + all comments + notes + lanes read-only. 403 on inaccessible. |
| POST   | /api/contracts                          | `Requester` / `Procurement`                         | `CreateContractRequest`    | 201 `ContractDetailDto`          | Per-category required fields validated against `CategoryField`. Vendor must exist + not be Blacklisted unless `procurementOverride=true` with reason (Procurement only). On insert, the API creates the 9 `ContractLane` rows in a single transaction (Procurement = `in_review`, others = `not_started`). |
| PATCH  | /api/contracts/{contractId}             | `Procurement`                                       | partial header fields      | 200 `ContractDetailDto`          | Edit title / priority / cost / dates / category-specific fields. Category itself is not editable after submission. |
| PATCH  | /api/contracts/{contractId}/overall     | `Procurement`                                       | `{ overallStatus, reason? }` | 200                              | Used to set `canceled` explicitly. Going `completed` is normally driven by Procurement lane → `complete` (§3.4); this endpoint is the override path. Produces `ActivityEvent: OverallStatusChanged`. |
| PATCH  | /api/contracts/{contractId}/owner       | `Procurement`                                       | `{ procurementOwnerUserId? }` | 200                              | Reassign Procurement owner. Audited. |
| DELETE | /api/contracts/{contractId}             | `Procurement`                                       | —                          | 204                              | Soft-delete only. |

### 3.4 Contract lanes (the v2.0 core)

| Method | Path                                                        | Auth          | Body                                                       | Returns                  | Notes |
|--------|-------------------------------------------------------------|---------------|------------------------------------------------------------|--------------------------|-------|
| GET    | /api/contracts/{contractId}/lanes                           | role-aware    | —                                                          | 200 `ContractLaneDto[]`  | All 9 lanes, ordered. Read on every detail load. |
| PATCH  | /api/contracts/{contractId}/lanes/{laneId}                  | `Procurement` | `{ status?, ownerUserId?, ownerLabel?, dueDate?, note? }` | 200 `ContractLaneDto`    | Partial update. Server validates `LaneId` shape, owner-shape (internal vs external), and the lane-status enum. Always touches `Contract.LastActionAt` and emits the appropriate `ActivityEvent` sub-type. **If `laneId = procurement` and `status = complete`**, also flips `Contract.OverallStatus = completed` in the same transaction and emits a second `ActivityEvent: OverallStatusChanged`. |

> **Lane updates are Procurement-only** (§2.13). Reviewers and Requesters see lane state but cannot mutate it — the endpoint rejects with 403 for those roles.

### 3.5 Reminders

Phase 1 reminders are **log-only** (`Channel = InAppLogOnly`). Microsoft 365 / Graph Mail send is architected for a later phase: the `NotificationLog` schema accepts the `Email` channel additively, and a thin `IMailSender` abstraction can be added without changing controllers, contracts, or `ActivityEvent` rows (ADR-034, ADR-039).

| Method | Path                                                | Auth          | Body                                                | Returns                  | Notes |
|--------|-----------------------------------------------------|---------------|-----------------------------------------------------|--------------------------|-------|
| GET    | /api/contracts/{contractId}/reminders/targets       | `Procurement` | —                                                   | 200 `ReminderTargetDto[]`| Returns the **subset of external lanes** (`vendor`, `requester`, `signature`) currently open (`status ∈ {in_review, waiting}`). For the requester lane, includes the requester email. Empty if no open external lane. |
| POST   | /api/contracts/{contractId}/reminders               | `Procurement` | `{ targetLaneId, subject?, message? }`              | 201 `NotificationLogDto` | Phase 1: `Channel = InAppLogOnly` — produces a `NotificationLog` row + paired `ActivityEvent: ReminderLogged`. Endpoint enforces `targetLaneId ∈ {vendor, requester, signature}` and that the lane is open; otherwise 400. |
| GET    | /api/contracts/{contractId}/reminders               | `Procurement` | —                                                   | 200 `NotificationLogDto[]` | Reminder history for this contract. |

### 3.6 Assignments (Attorney Reviewer membership)

| Method | Path                                                      | Auth          | Body                            | Returns                          | Notes |
|--------|-----------------------------------------------------------|---------------|---------------------------------|----------------------------------|-------|
| GET    | /api/contracts/{contractId}/assignments                   | role-aware    | —                               | 200 `AssignmentDto[]`            | Procurement / Reviewer can read; Requester cannot. |
| POST   | /api/contracts/{contractId}/assignments                   | `Procurement` | `{ reviewerUserId, team }`      | 201                              | Idempotent — duplicate active reviewer → 409. Produces `ActivityEvent: AssignmentAdded`. |
| DELETE | /api/contracts/{contractId}/assignments/{assignmentId}    | `Procurement` | —                               | 204                              | Soft-delete; produces `ActivityEvent: AssignmentRemoved`. |

### 3.7 Comments / Notes / Activity

| Method | Path                                                | Auth                                | Body                                       | Returns                  | Notes |
|--------|-----------------------------------------------------|-------------------------------------|--------------------------------------------|--------------------------|-------|
| GET    | /api/contracts/{contractId}/comments                | role-aware                          | —                                          | 200 `CommentDto[]`       | Internal-only filtered out for Requester. |
| POST   | /api/contracts/{contractId}/comments                | role-aware                          | `{ text, isInternalOnly }`                 | 201 `CommentDto`         | Requester cannot set `isInternalOnly=true`. |
| GET    | /api/contracts/{contractId}/notes                   | `Procurement` / `AttorneyReviewer`  | —                                          | 200 `NoteDto[]`          | Requester variant hides this. |
| POST   | /api/contracts/{contractId}/notes                   | `Procurement` / `AttorneyReviewer`  | `{ type, date, participants, text }`       | 201 `NoteDto`            | |
| PATCH  | /api/contracts/{contractId}/notes/{noteId}          | author only                         | partial                                    | 200                      | |
| DELETE | /api/contracts/{contractId}/notes/{noteId}          | author only                         | —                                          | 204                      | Soft-delete. |
| GET    | /api/contracts/{contractId}/activity                | role-aware                          | —                                          | 200 `ActivityEventDto[]` | Newest-first. Requester sees a redacted view (no internal lane-note changes). |

### 3.8 Attachments (per `api-blob-attachments.md`)

| Method | Path                                                                      | Auth                      | Body                              | Returns                          | Notes |
|--------|---------------------------------------------------------------------------|---------------------------|-----------------------------------|----------------------------------|-------|
| POST   | /api/contracts/{contractId}/attachment-batches                            | role-aware (any access)   | `{ }`                             | 201 `{ batchId }`                | Verify access → 403 if not. |
| POST   | /api/attachments                                                          | role-aware                | streamed body + `?batchId=&contractId=` | 201 `{ attachmentId }`     | Streams to Blob; content-type + size validated at controller. ≤5 concurrent per client. |
| POST   | /api/attachment-batches/{batchId}/complete                                | role-aware                | —                                 | 200                              | Counts rows in SQL — never trusts client. Idempotent. |
| GET    | /api/contracts/{contractId}/attachments                                   | role-aware                | —                                 | 200 `AttachmentDto[]`            | Soft-deleted excluded. |
| GET    | /api/attachments/{attachmentId}/content                                   | role-aware                | —                                 | 200 stream + `Content-Disposition` | `Cache-Control: private, no-store`. |
| DELETE | /api/attachments/{attachmentId}                                           | author or Procurement     | —                                 | 204                              | Soft-delete; blob retained per ADR-009. |

### 3.9 Vendors

| Method | Path                              | Auth          | Body                  | Returns                                  | Notes |
|--------|-----------------------------------|---------------|-----------------------|------------------------------------------|-------|
| GET    | /api/vendors                      | `Procurement` | `?query=&type=&preferredStatus=` | 200 paged `VendorRowDto[]`  | Master list. |
| GET    | /api/vendors/autocomplete         | any           | `?q=`                 | 200 `VendorSuggestionDto[]`              | Lightweight — `{ vendorId, name, preferredStatus }`. Used by intake forms. |
| GET    | /api/vendors/{vendorId}           | `Procurement` | —                     | 200 `VendorSummaryDto` + recent contracts | Powers the vendor summary modal. |
| POST   | /api/vendors                      | `Procurement` | `CreateVendorRequest` | 201 `VendorSummaryDto`                   | Fuzzy duplicate check → 409 with suggested match (ADR-010). |
| PATCH  | /api/vendors/{vendorId}           | `Procurement` | partial               | 200                                      | |

### 3.10 Bulk upload — four flows

| Method | Path                                | Auth          | Body                                  | Returns                       | Notes |
|--------|-------------------------------------|---------------|---------------------------------------|-------------------------------|-------|
| POST   | /api/bulk-upload/preview            | `Procurement` | multipart spreadsheet OR `{ rows: TextOrTypedRowDto[] }` | 200 `BulkUploadPreviewDto` | One endpoint serves all 4 flows: file drop = multipart; paste / type / manual = JSON rows. Per-cell validation + vendor de-dup matches. Preview state not persisted server-side — ADR-011. |
| POST   | /api/bulk-upload/commit             | `Procurement` | `{ rows: ContractDraftDto[] }`        | 201 `{ importedCount, failedCount, failures: [...] }` | Server re-validates each row. Atomic per-row; failures returned alongside successes. Each success creates a `Contract` + 9 `ContractLane` rows + `ActivityEvent: BulkImported`. Legacy `LegacyStatus` mapped to lane state (ADR-035). |

### 3.11 Reports

| Method | Path                              | Auth          | Body | Returns                            | Notes |
|--------|-----------------------------------|---------------|------|------------------------------------|-------|
| GET    | /api/reports/kpis                 | `Procurement` | —    | 200 `ReportsKpiDto`                | All six KPIs in one call: `contractsReviewedYtdAll`, `myReviewedYtd`, `activeRightNow`, `myActive`, `completedYtd`, `canceledYtd`. **`active*` counters = contracts with ≥1 lane in `{in_review, waiting}`** (§2.13). "My" variants scope to signed-in Procurement owner. |
| GET    | /api/reports/active-by-category   | `Procurement` | —    | 200 `[{ category, count }]`        | Active-contract count per category (Event / Facilities / IT). |
| GET    | /api/reports/active-by-owner      | `Procurement` | —    | 200 `[{ ownerUserId, ownerName, count }]` | Active-contract count per Procurement owner. |

### 3.12 Categories admin (S16)

Reads (`GET`) are always open to any authenticated user — intake screens rely on them to render. **Writes** (`POST` / `PATCH` / `DELETE`) require `ProcurementAdmin` **and** are additionally gated by the `categoriesAdminEnabled` configuration flag (off by default — ADR-037). When the flag is off, write endpoints return **`503 Service Unavailable`** with a ProblemDetails `detail = "Category management is disabled in this environment."` System-defined categories (`IsSystemDefined = true`) have additional protections: their `Code`, primary `IsSystemDefined` system fields, and existence cannot be removed.

| Method | Path                                              | Auth                                                       | Body                          | Returns                  | Notes |
|--------|---------------------------------------------------|------------------------------------------------------------|-------------------------------|--------------------------|-------|
| GET    | /api/categories                                   | any                                                        | `?includeInactive=`           | 200 `CategoryDto[]`      | Read by intake screens (any role) + admin. |
| GET    | /api/categories/{categoryId}                      | any                                                        | —                             | 200 `CategoryDetailDto`  | Includes the `CategoryField[]` set. |
| POST   | /api/categories                                   | `ProcurementAdmin` + flag                                  | `CreateCategoryRequest`       | 201                      | New category is always `IsSystemDefined = false`. 503 when flag is off. |
| PATCH  | /api/categories/{categoryId}                      | `ProcurementAdmin` + flag                                  | partial                       | 200                      | System categories: edit label / icon / sort / active only — `Code` and `IsSystemDefined` are immutable. Admin categories: full edit. |
| DELETE | /api/categories/{categoryId}                      | `ProcurementAdmin` + flag                                  | —                             | 204 / 409                | Soft-delete. Refuses (409) for system categories or for any category with active contracts. |
| POST   | /api/categories/{categoryId}/fields               | `ProcurementAdmin` + flag                                  | `CreateFieldRequest`          | 201                      | New field is always `IsSystemDefined = false`. Admin-added fields land in `ContractFieldValue` when contracts populate them. 503 when flag is off. |
| PATCH  | /api/categories/{categoryId}/fields/{fieldId}     | `ProcurementAdmin` + flag                                  | partial                       | 200                      | System fields: edit label / helper / sort / required / active only — `FieldKey`, `Type`, and `IsSystemDefined` are immutable. Admin fields: full edit. |
| DELETE | /api/categories/{categoryId}/fields/{fieldId}     | `ProcurementAdmin` + flag                                  | —                             | 204 / 409                | Soft-delete. Refuses (409) for system fields. |

### 3.13 Reminder settings (S16)

> Phase 1 ships the settings shell — configured values have no behavioral effect beyond display until the email channel is confirmed (§8).

| Method | Path                              | Auth          | Body                                              | Returns                  | Notes |
|--------|-----------------------------------|---------------|---------------------------------------------------|--------------------------|-------|
| GET    | /api/reminder-settings            | `Procurement` | —                                                 | 200 `ReminderSettingDto[]` | One row per Category. |
| PUT    | /api/reminder-settings/{category} | `Procurement` | `{ cadenceDays, templateBody, isEnabled }`        | 200                      | Audited. |

### 3.14 Error contract & cache headers

- All errors: RFC 7807 ProblemDetails with plain-language `detail`. Field-level validation errors populate the `errors` extension dictionary. Stack traces never reach clients (per `api-error-handling.md`).
- Default response header: `Cache-Control: private, no-store`. Lookup endpoints (`/api/me`, vendor autocomplete) may layer a short `max-age` but stay `private`.
- Enums on the wire are strings (`JsonStringEnumConverter`).

---

## 4. UI sketch

**Note on the design handoff.** The v1.0 bundle at `artifacts/docs/design/project/` and the blueprint at `artifacts/docs/design/full-design-blueprint.md` are stale — they describe a linear 13-status workflow that the brief replaced on 2026-06-22. Visual + structural decisions below derive from the v2.0 brief + the live React implementation under `web/src/` + the demo HTML at `artifacts/demo/Contract-Manager-Demo.html`. Tokens, components, and styling all flow from the repo design system (`.claude/rules/design/`).

The shell is in `web/src/components/AppShell/index.tsx`: McDermott lockup, sidebar nav grouped by role section, sticky top bar with breadcrumb + theme toggle + avatar, mobile drawer below 1024px per `app-shell-and-headers.md`. Role landing is `/api/me`-driven: Procurement → `/` (My dashboard), Requester → `/my-submissions`, AttorneyReviewer → `/my-reviews`.

### S1 — Sign-in (Entra redirect) [deferred — auth boilerplate]
Standard Entra-hosted sign-in. On return, `EnsureUserMiddleware` provisions/updates `dbo.Users`; client redirects to the role landing.
**Role:** all.

### S2 — My dashboard (Procurement default landing) [route `/`]
Page head "My active contracts" with date subtitle, "Bulk upload" + "New contract" actions. Filtered to contracts where the signed-in Procurement owner has **at least one lane in `{in_review, waiting}`**. Table columns: attention flag, contract title + number, vendor, category icon, lane-pill strip (Procurement-first then "+ N more" if other lanes are open), priority pill, value, next action due, last action — see ADR-029 / ADR-030 for the lanes model. Sortable columns, search, empty-row filter state per `loading-empty-and-error-states.md`.
**Role:** `Procurement`.

### S3 — Master view [route `/master`]
Every active contract across all Procurement owners. Same row shape as S2 plus a visible owner column. Default sort: priority desc, next-action due asc.
**Role:** `Procurement`.

### S4 — Contract detail [route `/contracts/:contractId`, role-aware]
Header eyebrow (contract number + category icon), title, sub-line (vendor link + cost + priority pill + overall status). **Persistent risk-review banner** above the lanes: "This tracks that review is happening — it does not replace the firm's existing risk-review process." **Top-right "Send reminder" button** — opens the modal restricted to open external lanes (UC4). **Lanes panel** collapsed to Procurement only by default with a "Show N other lanes" toggle. Each lane row: lane label + icon, status pill, owner (user pill internal / free-text external), due date, last updated, "Update" affordance (Procurement only). **Right rail** with key facts (requester + email, vendor link, value, term dates, parent event for Event). **Tabs**: Details, Documents, Comments, Notes, Activity. **No bell icons in lane rows** (brief §10.12). The same backend record powers S11 (Requester) and S13 (Reviewer) — the API returns a role-filtered DTO; the UI hides controls accordingly.
**Role:** `Procurement` (full edit). Requester / Reviewer variants share the route with role-filtered data.

### S5 — Submit Contract — category picker [route `/new-contract/category`]
Three large category cards (Event / Facilities / IT) with one-sentence subtitles. Rendered from `GET /api/categories` so the admin can re-label / re-order. Picker is a one-way fork — selection persists with the contract.
**Role:** `Requester` (Procurement can submit on behalf).

### S6 — IT intake form [route `/new-contract`]
Common fields (requester from `/api/me`, vendor autocomplete, contract title, total cost, term start, term end, description) + IT-type toggle (Software / Professional Services) + conditional Software fields (deployment, hosting, seats, application version/flavor, licensing type, system access, permissions, integrations) + Professional-services fields (engagement, scope, hours, on-site) + risk-review attributes (personal data Y/N, PHI Y/N, uses AI Y/N) + attachment area. Fields render from the `CategoryField` schema for `IT`. **Routing-preview panel** at the bottom: shows Procurement = "In review", plus each other applicable lane (Legal, GCO, and InfoSec/Privacy if triggered by the IT flags) = "Not started". Submit blocked on missing required fields. Blacklisted vendor blocks Requester submit (Procurement may override).
**Role:** `Requester` / `Procurement` on behalf.

### S7 — Event intake form [route `/new-contract/event`]
Common fields + event date, venue/location, parent event name. Helper text under cost: "Use the cost for this engagement only — not the whole conference." Same routing-preview pattern as S6.
**Role:** `Requester` / `Procurement`.

### S8 — Facilities intake form [route `/new-contract/facilities`]
Common fields + building + service description + term dates. Same routing-preview pattern as S6.
**Role:** `Requester` / `Procurement`.

### S9 — Vendor master + summary modal [route `/vendors`]
Sortable / searchable table: name, type, preferred-status badge, primary contact, contract count. "Add vendor" inline form (fuzzy duplicate check → merge prompt). Clicking a row opens the **vendor summary modal**: status badge, vendor-since text, contact details, notes, contracts with this vendor (each clickable to S4).
**Role:** `Procurement`.

### S10 — My submissions (Requester home) [route `/my-submissions`]
Read-only worklist scoped to the signed-in Requester. Columns: contract title, vendor, lane-pill strip (read-only), last action. Row click → S4 (Requester variant).
**Role:** `Requester`.

### S11 — My reviews (Attorney Reviewer home) [route `/my-reviews`]
Worklist of contracts where the signed-in user appears in `ContractAssignment`. Columns: contract, vendor, lane-pill strip (read-only), last action. Row click → S4 (Reviewer variant).
**Role:** `AttorneyReviewer`.

### S12 — Bulk upload (4 flows) [route `/bulk-upload`]
Step 1 — flow picker: **File drop** (drag-and-drop `.xlsx`), **Paste** (TSV/CSV from clipboard into a textarea), **Type** (inline editor with live row validation), **Manual entry** (single-row form). One flow at a time per session. Step 2 — preview table with per-cell error flags + inline edit + row-level skip; vendor de-dup matches shown alongside. Commit blocked until every flagged row is resolved (fixed or skipped). Toast confirms count on commit. A failed row does not fail the batch — others import; failures returned with reasons. Each imported row creates the contract + 9 lanes per the legacy-status mapping (ADR-012).
**Role:** `Procurement`.

### S13 — Reports [route `/reports`]
**Six KPI tiles** in the order specified by the brief: Contracts reviewed YTD (subtitle "Across all owners") · My reviewed YTD (subtitle: signed-in owner name) · **Active right now** (no sub-label — brief §5 / change-log) · My active · Completed YTD · Canceled YTD. **Horizontal bar series** below: Active by category (Event / Facilities / IT), Active by Procurement owner (4 named owners), Completed YTD by category.
**Role:** `Procurement`.

### S14 — Archive [route `/archive`]
Same row shape as S2/S3 filtered server-side to `OverallStatus ∈ {completed, canceled}`. Adds search (name / vendor / requester) + year selector. No "+ New" / "Bulk Upload" actions. Reopening a record (back to `active`) requires Procurement confirmation modal.
**Role:** `Procurement`.

### S15 — Renewals [route `/renewals`, **Coming Soon** stub]
Routed placeholder screen. Renders the standard AppShell + page head ("Renewals") + a centered card with the **"Coming Soon"** badge and one-sentence subtitle ("Renewal reporting will be available in a later phase. Until then, the Reports KPIs and Archive search cover near-term needs."). Sidebar nav includes a "Renewals" item flagged with a small "Coming Soon" pill. No API call; no data on the page. The existing `web/src/features/contracts/RenewalsScreen.tsx` is repurposed as the stub (or replaced) — `App.tsx` adds the `/renewals` route. **Wiring the actual report is explicitly deferred** (ADR-038); the screen exists so the Sidebar entry has somewhere to land and so the route is reserved.
**Role:** `Procurement`.

### S16 — Categories & Fields admin [route `/settings/categories`]
Lists every category and its field schema, read from `GET /api/categories` + `GET /api/categories/{id}`. **System-defined categories** (Event / Facilities / IT) and their system-defined fields are rendered as read-only — labels, sort order, and `IsActive` are still editable, but the typed columns they back cannot be removed (would break the schema). **Admin-defined categories and admin-added fields** are fully editable (rename, change required/active, delete) when the management UI is enabled. The "Add category" / "Add field" affordances and write endpoints are gated behind the `categoriesAdminEnabled` feature flag (off by default per ADR-037) — when the flag is off, the admin sees the schema in read-only mode; the data model is in place regardless. The whole route is `[Authorize(Roles="ProcurementAdmin")]`.
**Role:** `ProcurementAdmin`.

### S17 — Reminder settings [route `/settings/reminders`]
Per-category card grid (Event / Facilities / IT). Each card: cadence selector (1 / 2 / 4 / 8 weeks), template editor with merge tags (`{contractName}`, `{vendorName}`, `{requesterName}`), on/off toggle. Read-only summary at top: "Phase 1 logs reminder intent — outbound email channel is a build-time decision."
**Role:** `Procurement`.

### S18 — User profile / settings [route `/profile`]
Read-only: name, email, roles (from Entra). Editable: notification preference (in-app + email vs. in-app only) — value stored on `User` as a follow-up column when/if email is enabled.
**Role:** all.

### Cross-cutting (apply to every screen)

- **Lane status pills** use the McDermott badge pattern with the `mws-badge--hold` extension where relevant; theme-stable foreground rule applies (navy text on pale fills always).
- **Priority pill** treatment per brief §5: critical = saturated `--color-error`, high = `--color-pale-orange`, medium = `--color-pale-gold`, low = transparent + 1px border.
- **Vendor name on Procurement surfaces** opens the summary modal; on Requester / Reviewer surfaces it renders as plain text.
- **"Requester" is canonical** — the live web/src already normalizes the prototype's "Requestor" labels.
- **Every screen renders all three non-data states** (loading skeleton / error / empty) per `web-component-architecture.md`.
- **Tweaks panel from the v1 prototype is NOT carried into production** (prototype-only meta tool).
- **Theme toggle lives in the top bar** (real product feature, per `AppShell.jsx`).
- **Mobile responsive** at 320px per `responsive-and-mobile.md`; lane strips and bulk-upload preview need editorial collapse — already handled in the live web/src.

---

## 5. Auth + observability plan

- **Entra app registration:** single-tenant. App roles: `Procurement`, `ProcurementAdmin`, `Requester`, `AttorneyReviewer`. App-role membership is the authorization source of truth for both SPA and API. Per `api-client-auth.md`: SPA is registered as **SPA platform** (not public client); API is **Web**; redirect URIs include trailing-slash + no-trailing-slash variants for every local dev port + the App Service URL; `isFallbackPublicClient` stays `false`.
- **MSAL config:** `@azure/msal-browser` + `@azure/msal-react`; authority `https://login.microsoftonline.com/<tenant-id>`; `clientId` + `redirectUri` from env (non-secret); token cache in `sessionStorage`. Scope `api://<api-app-id>/.default`. SPA never carries a client secret. On 401 from API, fall back to `acquireTokenRedirect`.
- **API token validation:** `Microsoft.Identity.Web`. `[Authorize]` on every controller (only `/health/live` and `/health/ready` are anonymous). AFD-FDID middleware no-op'd until prod is fronted by Azure Front Door (header check per `api-auth.md`).
- **User provisioning:** `EnsureUserMiddleware` (per-replica `ConcurrentDictionary<Guid, byte>` cache) upserts `dbo.Users` on first authenticated request; reads `oid` / `name` / `preferred_username` from the JWT; best-effort. Clients never call a "register" endpoint.
- **Record access (per `api-record-access.md`):**
  - **Procurement** sees all contracts (role-wide) — list filters `IsDeleted = 0`; archive filters `OverallStatus ∈ {completed, canceled}`.
  - **Requester** sees contracts where `RequesterUserId = me` (ownership).
  - **AttorneyReviewer** sees contracts where `EXISTS (SELECT 1 FROM ContractAssignment WHERE ContractId = c.ContractId AND ReviewerUserId = me AND IsDeleted = 0)` (assignment).
  - Composes as OR; multi-role users see the union.
  - Lane updates (§3.4) gated to `Procurement` regardless of record access — Reviewers and Requesters see lanes but cannot mutate.
  - Detail / mutations re-apply check; ownership violation → 403, never 404. List queries filter in-query.
- **Logging:** Serilog → Console + Application Insights via `APPLICATIONINSIGHTS_CONNECTION_STRING`. Required structured properties: `UserId` (Entra `oid` — pseudonymous per `api-logging.md`) + `OperationId`. OperationId middleware is the first pipeline item; `X-Operation-Id` echoes on every response. **Never log** contract content, comment bodies, note bodies, lane notes, file content, vendor terms, recipient names/emails on reminders, or anything identifying a person beyond `UserId`. PII rules per `api-pii-handling.md`.
- **Telemetry events (≤5):**
  1. `ContractSubmitted` — `Category`, `RequesterRoleSnapshot`, `ITSubtype?`.
  2. `LaneStatusChanged` — `LaneId`, `FromStatus`, `ToStatus`, `OverallTransitioned` (bool).
  3. `ReminderLogged` — `TargetLaneId`, `Channel`.
  4. `BulkUploadCommitted` — `RowCount`, `FailureCount`, `Flow` (FileDrop / Paste / Type / Manual).
  5. `LoginSucceeded` — `Role[]`.

---

## 6. Security plan

- **A01 Broken access control —** `[Authorize(Roles="...")]` on every controller; record-level checks per `api-record-access.md` re-applied on detail + every mutation; 403 never 404; field-level filtering server-side for Requester / Reviewer DTOs. Lane updates gated to Procurement regardless of caller's record access.
- **A02 Cryptographic failures —** All secrets in Key Vault loaded via `DefaultAzureCredential`. Phase 1 secrets list is minimal — no outbound third-party API keys until the email channel is decided (open Q). TLS via App Service. SQL connection uses Managed Identity (no passwords).
- **A03 Injection —** EF Core LINQ for all single-table operations; stored procedures via `ExecuteSqlInterpolatedAsync` for anything beyond (per `api-data-access.md`); never `ExecuteSqlRawAsync` with concatenation. Bulk-upload preview re-validates server-side before insert. `JsonSerializerOptions.UnmappedMemberHandling = Disallow` on every controller. `CategoryField.OptionsJson` parsed defensively in the service layer (never indexed in raw SQL).
- **A04 Insecure design —** Soft-delete only on every entity. Lane-update endpoint gated to Procurement role (defense in depth on top of record-access). Vendor `Blacklisted` blocks Requester intake submit; Procurement override requires explicit `procurementOverride=true` + reason captured in `ActivityEvent`.
- **A05 Security misconfig —** Strict CSP per `api-performance.md` (`default-src 'none'; frame-ancestors 'none'`); `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; HSTS via App Service. Swagger off in prod (gated by `Swagger:Enabled`, not `IsDevelopment`).
- **A06 Vulnerable components —** SonarCloud SAST + Gitleaks + `npm audit` + `dotnet list package --vulnerable` wired in CI per `ci-pipeline.md`.
- **A07 Identification/auth —** `Microsoft.Identity.Web` validates JWTs; no custom parsing. App-role membership drives `[Authorize(Roles="...")]`.
- **A08 Software / data integrity —** Key Vault + Managed Identity; CI build; no runtime code download. Migrations applied manually per `database-migrations.md`. **`ContractLane` invariant: exactly 9 rows per contract** enforced at insert + tSQLt test asserting any divergence.
- **A09 Logging / monitoring —** Serilog + App Insights + `OperationId` + `UserId` (Entra oid only). Never log content. The 5 telemetry events above plus structured fields per request.
- **A10 SSRF —** No outbound user-controlled URLs in Phase 1. Vendor `PrimaryContactEmail` and `RecipientEmail` on `NotificationLog` are stored, never de-referenced. Bulk-upload spreadsheets parsed in-memory; not re-fetched.

---

## 7. Out of scope

**Tier 1 hard limits (out by gate):**
- Document **processing** — extraction, OCR, chunking, embeddings, vector search, RAG, conversation history grounded on contracts. (Basic file attachments — upload/list/download/delete — are in scope per `api-blob-attachments.md`.)
- Service Bus workers / queue-driven async. Phase 1 reminders are **logged only** — no background mail loop.
- External client-matter / ethical-wall access. Row visibility is app-managed only (brief §10.5).
- External-audience surface — clients, opposing counsel, public web. Vendors + DocuSign envelopes tracked as **lanes**, not authenticated users (brief §10.11).

**Product scope deferrals (out by analyst sign-off):**
- **iManage integration** (document storage / version control). Data model + blob handling are additive-compatible (ADR-008).
- **SpendConnect integration** (reporting feed). Replaced by the bulk-upload migration + in-product reporting (S13).
- **Outbound email send for reminders — designed for, not implemented in Phase 1.** Phase 1 logs reminder intent in `NotificationLog` + `ActivityEvent` with `Channel = InAppLogOnly`. The architecture is shaped to add **Microsoft 365 / Graph Mail send via Managed Identity** later: `NotificationLog.Channel = Email` and `Status = Sent | Failed` are reserved values; the `Mail.Send` app permission would be granted on the API's MI; a thin `IMailSender` service can be added without schema or contract changes. **No `IHostedService` mail loop**, no Graph client wiring, and no Key Vault entries are added in Phase 1 (ADR-034, ADR-039).
- **Background "out-for-signature" mail loop.** v1.0 had a 60-minute `IHostedService` polling for signature-lane contracts; Phase 1 drops this entirely. If revived, it pairs with the deferred Graph Mail sender above.
- **Admin-managed categories — UI / write endpoints deferred behind a feature flag.** The **data model is in place** (`Category.IsSystemDefined`, `CategoryField.IsSystemDefined`, `ContractFieldValue`) so admin-added categories and fields function at runtime once enabled. The `categoriesAdminEnabled` configuration flag controls whether the **management UI + write endpoints** are exposed; off by default in Phase 1 (ADR-037). Flipping the flag later requires no schema change.
- **Vendor Detail page.** Replaced by the summary modal from S9.
- **Per-contract reminder cadence override.** Settings are per-category for v1.
- **Email-to-intake.** Requesters submit through the web form.
- **Renewal report — routed Coming Soon stub at `/renewals` (S15) instead of unrouted.** The data + query logic for renewals (`TermEndDate` within N days) is **not implemented**; the route lands on a placeholder card so Procurement sees the future destination. Reports' Active KPI tiles + Archive search cover near-term needs (ADR-038).
- **Software license entitlement tracking** — explicitly out per brief §6.

---

## 8. Open questions

**Resolved 2026-06-22 (Analyst):**

1. ~~**Outbound mail channel for reminders.**~~ **Resolved:** Microsoft 365 / Graph Mail send is the chosen direction but is **designed-for-later, not implemented in Phase 1.** Phase 1 ships `Channel = InAppLogOnly` only; the schema and code shape accept Graph send additively (ADR-034, ADR-039).
2. ~~**Categories admin — add-new path.**~~ **Resolved:** Build the **database-backed configuration in full now**. `Category.IsSystemDefined` keeps Event/Facilities/IT separate from admin-added categories; admin-added field values land in `ContractFieldValue`. The `categoriesAdminEnabled` **feature flag** controls only whether the management UI and write endpoints are exposed (ADR-037).
3. ~~**Reviewer team taxonomy.**~~ **Resolved:** Fixed enum `ReviewerTeam` (`Privacy`, `InfoSec`, `GCO`, `Legal`, `Litigation`, `Corporate`, `Other`), backed by a SQL check constraint (ADR-036).
4. ~~**Renewal report — wire up?**~~ **Resolved:** Route `/renewals` to a "**Coming Soon**" stub page so the sidebar entry has a destination; do not wire the data + query (ADR-038).

**Still open:**

5. **Vendor de-duplication threshold.** Recommend normalized-name compare (strip case, punctuation, "Inc"/"LLC"/"Ltd" suffixes) plus Jaro-Winkler similarity ≥ 0.92 as merge-prompt trigger. Manual confirmation per match. Confirm with Lisa during build.
6. **Bulk-upload error tolerance ceiling.** Hard-block commit when >50% of rows have errors? Recommendation: yes, with override checkbox + reason logged in `ActivityEvent: BulkImported`.
7. **Pending requirements brief fields.** The brief still has `[PENDING]` markers for: Executive Sponsor (§2), InfoSec lead + Privacy lead approvers (§8), Legal/Compliance approval choice (§8), build / QA / UAT target dates (§9). **These are project / governance metadata, not runtime application data** — they live in the brief and don't require a runtime data-model entity. The data model is structured so that if any of them ever needs runtime tracking later (e.g. an in-app "Executive Sponsor sign-off" workflow per contract), it would land additively (a new lane in `ContractLane` if it became a review stage, or a new app-role + assignment row if it became a sign-off role) — no rework of existing tables. The Analyst should fill the brief's PENDING markers in `solution-requirements.md` Sections 2 / 8 / 9 when known; the build does not block on them.

---

*This plan covers every requirement in `solution-requirements.md` v2.0 and every routed screen in the live web/src implementation. Every non-default architectural decision is recorded in `decisions.md` alongside this file. The stale v1.0 design bundle in `artifacts/docs/design/` is preserved as historical context but is not the implementation target.*
