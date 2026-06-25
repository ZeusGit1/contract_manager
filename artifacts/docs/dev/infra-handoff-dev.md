# Azure Dev Infrastructure — Provisioning Handoff

**App:** Contract Manager (Phase 1 — Procurement contract review tracking)
**Owner (Analyst):** Laura Sros · laurasros@gmail.com
**Audience:** Head of Infrastructure / Cloud Platform team
**Date:** 2026-06-25
**Provisioning target:** Dev (this document). Staging and Prod are **sized** below but **not provisioned yet** — the firm Tier 1 framework runs migrations and deploys manually dev → staging → prod.

---

## 0. Executive summary — what to provision tomorrow

A single-region Azure App Service + Azure SQL deployment of a Tier 1 internal web app. ~100 named firm users at peak; data classified up to and including client-matter / privileged content; no document processing, no workers, no external clients. Authentication is single-tenant Entra ID with four app roles.

**Minimum resources for Dev:** 1 × resource group, 1 × App Service plan (Linux, B2 acceptable for Dev), 1 × App Service (API), 1 × Static Web App or App Service (SPA), 1 × Azure SQL logical server + 1 × database (Serverless General Purpose, 2 vCore max), 1 × Storage account (Blob only, ZRS), 1 × Key Vault, 1 × Application Insights resource + the underlying Log Analytics workspace, 1 × user-assigned Managed Identity shared by API + (eventually) migrations runner.

**Estimated Dev monthly cost:** USD ~$180–$260 at idle utilisation (App Service B2 ~$55, SQL Serverless ~$15–80 depending on auto-pause, Storage <$5, Key Vault <$5, App Insights ~$5–50, Static Web App Free tier $0).

---

## 1. App at a glance

| Field | Value |
|---|---|
| Solution name | Contract Manager |
| Solution tier (firm framework) | **Tier 1** — production-grade internal app, ≤100 concurrent users, single-tenant Entra, app-managed access |
| Phase | Phase 1 — Procurement contract review tracking only (no renewals, no iManage / SpendConnect integration) |
| Requesting group | Procurement (Lisa Farkas, Procurement Lead) |
| Repo | https://github.com/ZeusGit1/contract_manager |
| Repo layout | Monorepo: `web/` (React SPA), `api/` (ASP.NET Core), `database/` (T-SQL migrations + procedures + tSQLt) |
| Default branch | `dev` (integration branch — what gets demoed). `master` exists but is not part of the workflow. |
| Current state | Web SPA built and demoable locally against LocalDB (`demo-start.ps1`). API + database build is the next pass — Azure Dev is the first cloud landing. |

**Out of scope for Phase 1 (do NOT provision):** Service Bus, Azure Functions, Cognitive Services, Azure OpenAI / AI Search, Azure Container Apps, AKS, iManage, SpendConnect, any AI/LLM service.

---

## 2. Runtime, language, framework

| Layer | Stack | Runtime | Notes |
|---|---|---|---|
| **Web** | React 19 + TypeScript + Vite + CSS Modules + Vitest | Node 24 LTS (build only — runtime is the browser) | Builds to a static bundle. Hosted as static files behind App Service or as Azure Static Web App. |
| **API** | ASP.NET Core 10 (controllers, `[ApiController]`) + EF Core 10 + Microsoft.Identity.Web + Serilog | **.NET 10** (Linux) | All packages already pinned in `api/src/ContractManager.Api/ContractManager.Api.csproj`. |
| **Database** | Azure SQL Database (single DB, not Managed Instance) | SQL Server 2022 compatibility level (160) | Migrations are forward-only T-SQL files in `database/migrations/`; stored procedures in `database/procedures/`; tSQLt tests in `database/tests/`. |
| **Storage** | Azure Blob Storage | Hot tier | Basic file attachments only — no processing, no extraction, no OCR. |

Container base images planned for production: `mcr.microsoft.com/dotnet/sdk:10.0` (build) and `mcr.microsoft.com/dotnet/aspnet:10.0` (runtime). Dev can run as App Service code deploy (no container) to keep iteration fast.

---

## 3. Architecture diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Firm Entra ID (single-tenant)                                                │
│  ┌─────────────────────────────────┐    ┌──────────────────────────────────┐  │
│  │  App registration: SPA platform  │    │  App registration: Web platform  │  │
│  │  contract-manager-web-dev        │    │  contract-manager-api-dev        │  │
│  │  - Authorization Code + PKCE     │    │  - Validates JWT                 │  │
│  │  - No client secret              │    │  - App roles defined here:       │  │
│  │  - Scope: api://api-app-id/.default │ │    Procurement, ProcurementAdmin,│ │
│  └──────────────┬──────────────────┘    │    Requester, AttorneyReviewer   │  │
│                 │                       └──────────────────────────────────┘  │
└─────────────────┼──────────────────────────────────┬──────────────────────────┘
                  │ MSAL redirect / token            │ JWT validated by
                  │                                  │ Microsoft.Identity.Web
                  ▼                                  │
┌──────────────────────────────┐                     │
│  Browser (firm staff)         │                    │
│  React 19 SPA                 │                    │
└──────────────┬───────────────┘                     │
               │ HTTPS                               │
               ▼                                     │
┌──────────────────────────────┐                     │
│  Web hosting                  │                    │
│  Static Web App OR App Service│                    │
│  serving Vite build output    │                    │
└──────────────┬───────────────┘                     │
               │ fetch /api/* (CORS)                 │
               ▼                                     │
┌──────────────────────────────────────────────────────────────────────────────┐
│  App Service (Linux, .NET 10)                                                 │
│  contract-manager-api-dev                                                     │
│  - Serilog → Console + Application Insights                                   │
│  - OperationId middleware (correlation IDs on every request)                  │
│  - System-assigned + user-assigned MI                                         │
└──┬───────────────┬───────────────┬──────────────────────────────────────────┘
   │ MI            │ MI            │ MI
   ▼               ▼               ▼
┌──────────┐  ┌─────────────┐  ┌──────────────────────┐
│ Key Vault│  │ Azure SQL DB│  │ Azure Blob Storage   │
│ secrets  │  │ Serverless  │  │ contract-attachments │
│ at start │  │ AAD-only    │  │ Hot tier             │
└──────────┘  └─────────────┘  └──────────────────────┘
                                       │
                                       ▼
                              ┌──────────────────────┐
                              │ Application Insights │
                              │ + Log Analytics WS   │
                              └──────────────────────┘
```

**Notes on the diagram:**
- The API talks to **every Azure resource via Managed Identity** — no connection strings with passwords, no storage keys, no DB password. The only secret class in Key Vault is third-party API keys, of which Phase 1 has **none**.
- No Service Bus, no Worker, no Functions. The "Send reminder" feature in Phase 1 writes a `NotificationLog` row only (`Channel = InAppLogOnly`) — no outbound mail is sent.
- No Azure Front Door for Dev. The AFD-FDID middleware in the API is a no-op when `Security:FrontDoor:FrontDoorId` is unset (see `.claude/rules/dev/api-auth.md`).
- No CDN, no Redis, no caching layer. Caching is in-process per `api-performance.md`.

---

## 4. Required Azure services (Dev)

| # | Service | SKU / Tier (Dev) | Why | Sizing notes |
|---|---|---|---|---|
| 1 | **Resource group** | n/a | Container | One per environment: `rg-contract-manager-dev` (suggested) |
| 2 | **App Service plan** | Linux, **B2** (or P0v3 if firm standard) | Hosts API | Plan-wide; one App Service inside. Scale up to S1 if Dev gets heavy load; not required at launch. |
| 3 | **App Service (API)** | .NET 10, Linux | API runtime | Always-on enabled. Health endpoint `/health/live` (anonymous, no DB call) and `/health/ready` (DB ping). |
| 4 | **Static Web App** OR App Service (SPA) | Free tier (Static Web App) | Hosts React SPA | Static Web App is simplest; alternatively a second App Service serving Vite build output. Either works. |
| 5 | **Azure SQL logical server + DB** | **Serverless, General Purpose, 2 vCore max, auto-pause 1 hour** | Primary data store | Forward-only T-SQL migrations applied manually. AAD-only authentication. ~12 tables; ≤100 concurrent users. Estimated active hours per month Dev: ~40–80, so Serverless billing wins. |
| 6 | **Storage account** | StorageV2, ZRS, Hot tier | Basic file attachments | Container `contract-attachments` (flat, blob name = `{AttachmentGuid}/{sanitized-filename}` — see ADR-008 in `decisions.md`). Block public access at the account level. Enable soft-delete on blobs (7 days minimum). |
| 7 | **Key Vault** | Standard | Secrets at startup via `DefaultAzureCredential` | Phase 1 carries **no third-party API keys** — the vault is provisioned for the rotation pattern + future readiness (e.g. when outbound email lands). Enable RBAC, not access policies. Soft-delete + purge protection ON. |
| 8 | **Application Insights** + Log Analytics workspace | Pay-as-you-go, **30 day retention** for Dev | Telemetry + structured logs | Workspace-based App Insights resource. The API reads the connection string from env var `APPLICATIONINSIGHTS_CONNECTION_STRING` (not the legacy instrumentation key). |
| 9 | **User-assigned Managed Identity** | n/a | Shared by API (and future migrations Container App Job) | Cleaner separation than system-assigned for cross-resource grants. See §6 for role assignments. |

**Not needed for Dev (do NOT create):** Azure Front Door, Application Gateway, Redis Cache, Service Bus namespace, Container Apps Environment, Azure OpenAI, AI Search, Document Intelligence, Cognitive Services, AKS, Functions, Logic Apps, Event Grid, Event Hub.

### Sizing for Staging / Prod (forward-looking — do NOT provision now)

| Service | Staging | Prod |
|---|---|---|
| App Service plan | P0v3 | **P1v3** (two replicas for HA) |
| Azure SQL | Serverless 4 vCore | **GP Provisioned 4–8 vCore** (Serverless auto-pause undesirable in prod) |
| App Insights | 90-day retention | 90-day retention |
| Key Vault | Standard | Standard |
| Storage | ZRS | **GZRS** (geo-redundant) |
| Region | Same as Dev | Same region; pair second region only if DR requirement emerges (currently not required at Tier 1) |

---

## 5. Environment variables — exact list

The API reads everything below from App Service application settings. **None of these values are secrets in their own right** — they are non-secret configuration (Key Vault URI, endpoint URIs, queue names, allowed origins). Actual secrets (none in Phase 1) live inside Key Vault and are fetched at startup via `DefaultAzureCredential`. See `.claude/rules/dev/api-secrets.md`.

### Required at API startup

| Key | Example value (Dev) | Source | Notes |
|---|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Development` | infra | Toggles dev exception page. Note: Swagger is gated by `Swagger:Enabled`, NOT `IsDevelopment()` — see `api-coding-standards.md`. |
| `ASPNETCORE_URLS` | `http://+:8080` | infra | Listening port inside the App Service container. |
| `KeyVault__Uri` | `https://kv-contract-manager-dev.vault.azure.net/` | infra | API reads secrets from here at boot. Phase 1 contains no third-party secrets but the vault is wired. |
| `ConnectionStrings__Default` | `Server=tcp:sql-contract-manager-dev.database.windows.net,1433;Database=contract-manager-dev;Authentication=Active Directory Default;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30` | infra | **No password.** Managed Identity authenticates to Azure SQL. |
| `Storage__BlobEndpoint` | `https://stcontractmanagerdev.blob.core.windows.net/` | infra | Used by `BlobServiceClient` with `DefaultAzureCredential`. |
| `Storage__AttachmentsContainer` | `contract-attachments` | infra | Container name (non-secret). |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | `InstrumentationKey=...;IngestionEndpoint=...` | infra | The full AI connection string — write-only ingestion. Safe to expose, but conventionally placed in app settings. |
| `AzureAd__Instance` | `https://login.microsoftonline.com/` | infra | MSAL authority host. |
| `AzureAd__TenantId` | `<firm-tenant-guid>` | infra | Single-tenant Entra tenant ID. |
| `AzureAd__ClientId` | `<api-app-id-guid>` | infra | API app registration's client ID (the audience the API validates). |
| `AzureAd__Audience` | `api://<api-app-id-guid>` | infra | Token `aud` claim must equal this. |
| `Api__AllowedOrigins__0` | `https://contract-manager-web-dev.azurestaticapps.net` | infra | CORS allowlist. Add `http://localhost:5173` (and 5174, 5175 fallbacks per `api-client-auth.md`) for local dev. |
| `Swagger__Enabled` | `true` (Dev only) | infra | Gates Swagger UI behind a config flag, not the env name. Set to `false` in Prod. |
| `Security__FrontDoor__FrontDoorId` | _(unset in Dev)_ | infra | Leave unset until Prod is fronted by AFD. Middleware no-ops when blank. |
| `Features__CategoriesAdminEnabled` | `false` | infra | Phase 1 ships the schema; the management UI + write endpoints are gated. See ADR-037. |

### Required at SPA build time

The SPA reads these from Vite env vars baked into the bundle at build time (`web/.env.production`). **None are secret** — client IDs and tenant IDs are public in any OAuth flow.

| Key | Example value (Dev) |
|---|---|
| `VITE_AAD_TENANT_ID` | `<firm-tenant-guid>` |
| `VITE_AAD_CLIENT_ID` | `<spa-app-id-guid>` |
| `VITE_AAD_AUTHORITY` | `https://login.microsoftonline.com/<firm-tenant-guid>` |
| `VITE_AAD_REDIRECT_URI` | `https://contract-manager-web-dev.azurestaticapps.net` |
| `VITE_AAD_API_SCOPE` | `api://<api-app-id-guid>/.default` |
| `VITE_API_BASE_URL` | `https://contract-manager-api-dev.azurewebsites.net` |
| `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` | `InstrumentationKey=...` (same AI resource as API — frontend telemetry per `web-error-logging.md`) |

---

## 6. Security requirements

### 6.1 Identity & access (Entra ID)

Per `.claude/rules/dev/api-client-auth.md`, two app registrations are required. **Mark these with whichever path applies to your firm:**

#### Path A — Identity team needs to create the registrations

**API app registration: `contract-manager-api-dev`**
- Platform: **Web** (NOT public client; NOT SPA)
- `isFallbackPublicClient: false` (default — do not flip)
- Token format: v2.0 (`accessTokenAcceptedVersion: 2` in manifest)
- Expose an API: `api://<api-app-id>` with one scope `.default` (or `access_as_user`)
- App roles (defined on the API registration):
  - `Procurement` — value: `Procurement`
  - `ProcurementAdmin` — value: `ProcurementAdmin`
  - `Requester` — value: `Requester`
  - `AttorneyReviewer` — value: `AttorneyReviewer`
- `requiredResourceAccess`: none (Phase 1 has no Graph permission — see §6.2 below)

**SPA app registration: `contract-manager-web-dev`**
- Platform: **Single-page application (SPA)** — Authorization Code with PKCE
- `isFallbackPublicClient: false`
- Redirect URIs (`spa.redirectUris`): register **both** with and without trailing slash for every host:
  - `https://contract-manager-web-dev.azurestaticapps.net`
  - `https://contract-manager-web-dev.azurestaticapps.net/`
  - `http://localhost:5173`, `http://localhost:5173/`
  - `http://localhost:5174`, `http://localhost:5174/`
  - `http://localhost:5175`, `http://localhost:5175/`
- `requiredResourceAccess`: scope `api://<api-app-id>/.default` on the API registration above
- Admin consent: grant via `oauth2PermissionGrants` with `consentType: AllPrincipals` (NOT per-user — per `api-client-auth.md`)

#### Path B — Identity team has already created them

Please provide:
- API client ID: ____________________
- API audience URI: ____________________
- SPA client ID: ____________________
- Firm tenant ID: ____________________
- Confirmation that the four app roles above are defined on the API registration with the exact value strings shown.

### 6.2 Managed Identity role assignments (mandatory)

The API's user-assigned Managed Identity needs the following role assignments **before** the App Service will start successfully. Per `api-secrets.md`, missing any of these surfaces only as a runtime crashloop, not as a deploy-time error.

| Resource | Role | Why |
|---|---|---|
| Key Vault `kv-contract-manager-dev` | **Key Vault Secrets User** | Read secrets at startup. (Phase 1 has no secrets to read, but the wiring is in place.) |
| Storage account `stcontractmanagerdev` | **Storage Blob Data Contributor** | Read/write `contract-attachments` blobs. |
| Azure SQL DB `contract-manager-dev` | Custom DB role with `EXECUTE` on app procedures, `SELECT`/`INSERT`/`UPDATE` on app tables | Database access. SQL is AAD-only; no SQL auth. The MI must be added as an AAD user in SQL: `CREATE USER [mi-contract-manager-dev] FROM EXTERNAL PROVIDER;` then granted to the app DB role. |

**Phase 1 does NOT need:**
- Microsoft Graph `Mail.Send` — outbound email is deferred (see Open Question 5 in `plan.md` and ADR-034/039 in `decisions.md`). When email is enabled in a later phase, the Graph permission can be added without code change.
- Service Bus Data Sender/Receiver — no Service Bus in Phase 1.
- Azure OpenAI / AI Search roles — no AI services in Phase 1.

### 6.3 Network & transport

| Concern | Setting |
|---|---|
| HTTPS-only | Enforced on App Service, Static Web App, Storage account, Azure SQL |
| TLS minimum | 1.2 (1.3 preferred where supported) |
| HSTS | App Service-default in Dev; `Strict-Transport-Security: max-age=31536000; includeSubDomains` in Prod (per `api-performance.md`) |
| App Service IP restrictions | None in Dev (open to internet for analyst testing). **Prod will be fronted by Azure Front Door**, and the API will validate `X-Azure-FDID` per `api-auth.md`. |
| SQL firewall | Allow Azure services + the firm's dev VPN range. Do NOT allow `0.0.0.0/0`. |
| Storage firewall | Allow trusted Microsoft services + firm VPN. Block public anonymous access at the account level. |
| Key Vault firewall | Trusted Microsoft services + firm VPN. RBAC-based access, not access policies. |

### 6.4 Secret-scanning & supply chain

Already wired in CI (`.github/workflows/`) per `ci-pipeline.md` — no infra action needed:
- Gitleaks on every push (commit-time secret detection)
- `dotnet list package --vulnerable --include-transitive` on every PR
- `npm audit --audit-level=high` on every PR
- SonarCloud SAST (requires a SonarCloud token — secret-scan it, do not commit)

If SonarCloud is part of this Dev provisioning request, the SonarCloud token will need a Key Vault entry (`SonarCloud-Token`) and the CI pipeline will read it. Confirm with the platform team whether this token already exists.

---

## 7. Database & storage requirements

### 7.1 Azure SQL

| Field | Value |
|---|---|
| Server name | `sql-contract-manager-dev` |
| Database name | `contract-manager-dev` |
| Auth mode | **Microsoft Entra-only** (`Active Directory authentication`). Disable SQL authentication. |
| Server admin | An Entra security group (e.g. `sg-contract-manager-dba`) — never a named user |
| Service tier (Dev) | Serverless, General Purpose, 2 vCore max, **auto-pause after 60 min** |
| Backup retention | 7 days PITR (Dev default is fine) |
| TDE | Enabled (default) — required by firm policy for confidential / privileged data |
| Always Encrypted | Not used in Phase 1; columns are at-rest encrypted via TDE only. Revisit if a column-level requirement emerges. |
| Schema | Six audit columns on every table (`CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `DeletedAt`) — see `database-coding-standards.md`. Soft-delete only, retained in perpetuity. |
| Migrations | Forward-only T-SQL in `database/migrations/`. **Applied manually dev → staging → prod.** No auto-migrate on startup. No EF Core migrations bundle. |
| ~Initial data size | ~10 MB at launch (seed data from `artifacts/docs/product/sample-data/contracts-seed-data.xlsx` — 31 contracts, 23 vendors, 15 users). |
| Growth estimate | <500 MB/year at projected throughput (a few hundred contracts/year × ≤10 attachment metadata rows × audit log). The blobs themselves live in Storage. |
| Tables (Phase 1) | 12: `Vendor`, `Contract`, `ContractLane`, `Category`, `CategoryField`, `ContractFieldValue`, `User`, `ContractAssignment`, `ContractComment`, `ContractNote`, `ContractAttachment`, `ContractAttachmentBatch`, `ActivityEvent`, `NotificationLog` (plus `__EFMigrationsHistory`-style migrations log). See `plan.md` §2 for full schema. |

### 7.2 Azure Blob Storage

| Field | Value |
|---|---|
| Storage account name | `stcontractmanagerdev` (lowercase, no hyphens — Azure naming rule) |
| Kind | StorageV2 |
| Replication | ZRS (Dev). GZRS for Prod. |
| Access tier | Hot |
| Containers | One: `contract-attachments` |
| Naming | Flat. Blob name shape: `{AttachmentGuid}/{sanitized-filename}` (ADR-008). The `/filename` segment is cosmetic; never used to derive identity or access. |
| Public access | **Blocked at account level.** All access via Managed Identity + SQL-authoritative pointer. |
| Soft-delete | Blob soft-delete: 7 days minimum. Container soft-delete: enabled. |
| Versioning | Native Blob versioning enabled at container level (per `api-blob-attachments.md`) |
| Allowed file size | Enforced at API controller boundary (config-driven). Default limit: **50 MB per attachment**, adjustable in app settings before launch. |
| Allowed content types | Allowlist enforced at API controller. Default: PDF, DOCX, XLSX, PPTX, PNG, JPG, JPEG, TIFF, MSG, EML. Confirm with Procurement before launch. |

### 7.3 Application Insights / Log Analytics

| Field | Value |
|---|---|
| Workspace name | `log-contract-manager-dev` |
| App Insights name | `appi-contract-manager-dev` |
| Workspace-based | Yes (required by current Azure default) |
| Retention | 30 days (Dev). 90 days (Prod). |
| Daily cap | $5 USD/day (Dev — avoid surprise bills) |
| Connection string | Stored in App Service app setting `APPLICATIONINSIGHTS_CONNECTION_STRING`. The SPA also uses the same connection string for `@microsoft/applicationinsights-web` per `web-error-logging.md`. |

---

## 8. API keys / secrets

### Phase 1: **none required**

Phase 1 has no third-party integrations that issue keys. Specifically:
- No OpenAI / Anthropic API key (no AI in this app).
- No SendGrid / Twilio / etc. (no outbound email/SMS in Phase 1 — reminders log only).
- No iManage / SpendConnect tokens (deferred to a later phase).
- No SQL password (Managed Identity).
- No Storage account key (Managed Identity).
- No Service Bus connection string (no Service Bus).

Key Vault `kv-contract-manager-dev` is provisioned anyway so:
1. The Managed Identity → Key Vault Secrets User role assignment is in place and validated end-to-end.
2. When SonarCloud / future Graph Mail / future integrations land, the rotation pattern is already wired.

**Initial Key Vault contents:** none, or one placeholder entry like `placeholder` = "this vault is wired and tested" so smoke tests can confirm the API can read from it.

---

## 9. Expected users (Phase 1)

| Role | Count | Description |
|---|---|---|
| `Procurement` | 4 named users | Lisa Farkas (Procurement Lead), Marcus Webb, Lauren Pike, Tom Reyes. Daily power users. |
| `ProcurementAdmin` | 1–2 of the above | Layered on top of Procurement; the only role that can write to Category / CategoryField. UI gated by feature flag in Phase 1. |
| `AttorneyReviewer` | ~50 across Privacy / InfoSec / GCO / Legal | Assigned per contract; comment-and-attach surface only. |
| `Requester` | Any firm employee | Self-service intake. Read-only worklist for their own submissions. |

**Peak concurrent users (Phase 1):** comfortably under 100 — the active dashboard population is the small Procurement team plus the subset of attorneys actively reviewing. **Capacity gate:** the Tier 1 framework default is **100 concurrent users**; we are well inside that envelope.

---

## 10. Data sensitivity

| Class | Applies? | Examples |
|---|---|---|
| **Confidential** | ✅ Yes — default for every contract record | Vendor terms, pricing, internal review notes |
| **Attorney-client privileged** | ✅ Yes — for any contract routed through Legal / GCO | Privileged commentary on Notes / Comments tabs |
| **PII** | ✅ Yes | Vendor contact details, requester / reviewer identities, signers |
| **PHI / HIPAA-regulated** | Possibly — only on contracts where the IT category `AccessesPHI` flag is true | Tracked as a contract attribute; the app does not display PHI itself |
| **Client-matter / ethical-wall data** | ❌ **No** | Hard out by Tier 1 framework gate — see `_core-requirements.md` "Project Scope" |

**Handling rules (enforced in code, see `api-pii-handling.md`):**
- Logs carry only the pseudonymous `UserId` (Entra `oid` GUID) and `OperationId` — never email, display name, contract content, comment/note bodies, vendor terms, or attachment file content.
- Stack traces and internal error details never reach the client — RFC 7807 ProblemDetails with a generic `detail` field.
- Soft-delete only; retained in perpetuity. No GDPR-style hard-delete path in Phase 1.
- Audit columns on every table capture who and when for every read/write.

---

## 11. AI model / service dependencies

**None in Phase 1.** This app does not call any LLM, embedding model, OCR engine, vector store, or AI-Foundry service. The "Send reminder" feature is a SQL row + activity log; nothing in Phase 1 is generative.

Future phases may add document classification or extraction over attachments — that's a Tier 1+ promotion conversation and is explicitly out of scope today (see Section 7 of `plan.md`).

---

## 12. Deployment instructions

### 12.1 Pipeline expectations

- CI lives in `.github/workflows/ci.yml` per `ci-pipeline.md` (lint + format + audit + unit + integration + tSQLt tests on every PR to `dev`).
- **No CD pipeline in Phase 1.** Deployment to Dev is **manual** by the developer using:
  - `dotnet publish -c Release` → zip → `az webapp deploy` or `az webapp deployment source config-zip`
  - Web bundle: `npm run build` → `swa deploy` (if Static Web App) or zip → `az webapp deploy` (if App Service)
  - Database: dev runs T-SQL migration files in `database/migrations/` against the Dev DB manually, in numeric order, then the procedures in `database/procedures/`.
- **Migrations runner Container App Job** (mentioned in `database-migrations.md` as the test-tenant deviation) is **NOT required for Dev**. Manual application is fine.

### 12.2 Dev provisioning order (suggested for infra)

1. Resource group `rg-contract-manager-dev`
2. Log Analytics workspace `log-contract-manager-dev`
3. Application Insights `appi-contract-manager-dev` (workspace-linked)
4. User-assigned Managed Identity `mi-contract-manager-dev`
5. Key Vault `kv-contract-manager-dev` (RBAC, soft-delete + purge protection, firewall configured)
6. Storage account `stcontractmanagerdev` (ZRS, Hot, public access blocked, soft-delete + versioning, container `contract-attachments`)
7. Azure SQL logical server `sql-contract-manager-dev` (Entra-only auth, firewall configured, server admin = Entra group)
8. Azure SQL database `contract-manager-dev` (Serverless GP 2 vCore, auto-pause 60min, TDE on)
9. App Service plan (Linux B2)
10. App Service (API) `contract-manager-api-dev` (.NET 10, always-on, MI attached)
11. Static Web App `contract-manager-web-dev` OR a second App Service for the SPA
12. **Role assignments** for the MI on Key Vault / Storage / SQL (see §6.2). The SQL grant requires running `CREATE USER ... FROM EXTERNAL PROVIDER` inside the DB as the server admin.
13. App settings populated on the API App Service per §5.
14. Smoke test: hit `https://contract-manager-api-dev.azurewebsites.net/health/ready` — expect 200 (DB ping OK).

### 12.3 First-deploy verification checklist

- [ ] `/health/live` returns 200 anonymously.
- [ ] `/health/ready` returns 200 (proves DB Managed Identity grant works).
- [ ] SPA loads, redirects to Entra sign-in, returns with a valid token.
- [ ] An authenticated request hits the API and is logged in App Insights with a populated `UserId` (Entra `oid` only) and `OperationId`.
- [ ] An attachment upload writes to Blob and creates the SQL row (proves Storage MI grant works).
- [ ] No secret ever appears in logs (Gitleaks already enforces this on commit; verify the same in runtime telemetry).
- [ ] `appsettings.Development.json` does NOT contain any secret (per `api-secrets.md`).

---

## 13. Logging / monitoring needs

| Concern | How |
|---|---|
| **Application logs** | Serilog → Console (App Service stdout capture) + Application Insights (`Serilog.Sinks.ApplicationInsights`). Required structured fields on every entry: `UserId` (Entra `oid`), `OperationId`. |
| **Correlation IDs** | `X-Operation-Id` header echoed on every response. OperationId middleware is the first pipeline item, before auth, so even auth failures correlate. |
| **Frontend errors** | SPA initialises `@microsoft/applicationinsights-web` with the same connection string. A React error boundary at the app root calls `appInsights.trackException()`. See `web-error-logging.md`. |
| **Telemetry events (≤ 5)** | `ContractSubmitted`, `LaneStatusChanged`, `ReminderLogged`, `BulkUploadCommitted`, `LoginSucceeded`. Never log content. See `plan.md` §5. |
| **Health checks** | `/health/live` (no DB) + `/health/ready` (DB ping). Configure App Service health check on `/health/ready` if desired. |
| **Alerting (Dev — minimal)** | Single alert on API HTTP 5xx rate > 5% over 15 min, routed to the analyst. Add SQL DTU > 80% sustained 30 min alert if budgets tighten. No PagerDuty in Dev. |
| **Cost alerts** | Resource group budget alert at $200/mo and $300/mo — this app should sit well under both at Dev utilisation. |

---

## 14. Known limitations & risks

| # | Risk | Phase 1 mitigation | Future treatment |
|---|---|---|---|
| 1 | **Manual deploys to Dev.** No CD pipeline — increases room for "works on my machine" deploys. | Document the exact `az` commands and run them from a single developer machine. | Add a GitHub Actions deploy job when Staging is provisioned. |
| 2 | **Manual database migrations.** Same risk class. | Migrations are forward-only with `IF NOT EXISTS` guards (per `database-migrations.md`) so re-running is safe. | Add the Container App Job migrations runner when Staging is provisioned, per `database-migrations.md`. |
| 3 | **Single-region.** No DR. | Acceptable for Dev. | Cross-region DR is a Tier 1+ promotion conversation, not a Tier 1 default. |
| 4 | **Single replica.** App Service B2 is one instance — restart = brief downtime. | Acceptable for Dev. | Move to P1v3 with two replicas in Prod. |
| 5 | **SQL Serverless auto-pause cold start.** First request after pause = ~5–30s. | Acceptable for Dev — analyst-only usage. | Provisioned compute in Prod. |
| 6 | **No outbound email in Phase 1.** Reminders log to `NotificationLog` only; vendors / requesters / DocuSign are not notified by the system. | Documented in the brief §6, UC4, and ADR-034/039. Procurement continues to send the actual email manually for now. | When the firm confirms the channel (Microsoft Graph Mail via API's MI is the planned path), add `Mail.Send` to the MI and a thin `IMailSender` service. **Not part of this Dev provisioning** per agreed scope. |
| 7 | **Categories admin UI feature-flagged off.** Procurement cannot add new categories at runtime in Phase 1. | The data model supports it; `Features__CategoriesAdminEnabled = true` flips it on (ADR-037). | Enable when the analyst+Procurement are ready to validate the admin surface. |
| 8 | **Stale v1 design bundle.** `artifacts/docs/design/project/` still describes the linear 13-status workflow superseded on 2026-06-22 by parallel lanes. | The plan and brief are authoritative (see ADR-033 in `decisions.md`). Anyone reviewing the design bundle should read `plan.md` §4 and the brief v2.0 instead. | Refresh the bundle if a future Claude Design iteration is run. |
| 9 | **Entra app registration may not exist yet.** Identity team coordination is the critical-path item for the day-1 deploy. | Section 6.1 documents both Path A (create) and Path B (use existing). | Confirm before Dev infra provisioning starts. |
| 10 | **No client-matter / ethical-wall integration.** This is a hard Tier 1 gate — not a Phase 1 deferral. | The access model is app-managed (role / ownership / role-scope / assignment). | If the firm ever needs ethical-wall enforcement on contract access, that's a framework promotion, not an additive feature. |

---

## 15. Open items for infra to confirm

The questions below are the only ones I could not answer from the requirements brief, plan, or rule files. Please mark answers before tomorrow's provisioning:

1. **Region:** ___________ (firm default per Sr. Infra lead)
2. **Subscription:** ___________
3. **Resource group naming convention:** match `rg-contract-manager-dev`, or use the firm convention?
4. **App Service SKU for Dev:** B2 (~$55/mo) is my recommendation. Firm preference?
5. **Static Web App vs second App Service for the SPA:** either works — Static Web App is simpler and free at Dev volume.
6. **SQL server admin:** which Entra group will own DBA access?
7. **Entra app registrations:** Path A (create them) or Path B (use existing) — see §6.1.
8. **SonarCloud token:** does the firm already have a SonarCloud organisation + project, and does the token already live in a shared Key Vault we can reference?
9. **Firewall ranges:** which VPN / office IP ranges should be allowlisted on SQL, Storage, and Key Vault for analyst/developer access?
10. **Cost alert recipient(s):** who should the $200/$300 budget alerts route to?

---

## 16. References

- Requirements brief: [solution-requirements.md](../product/solution-requirements.md) — Phase 1 scope, lanes model, acceptance criteria
- Build plan: [plan.md](plan.md) — data model, API contracts, UI sketch, security plan
- Architectural decisions: [decisions.md](decisions.md) — ADR log; compliance audit trail
- Framework constitution: [CLAUDE.md](../../../CLAUDE.md) — Tier 1 gate, universal guardrails
- Engineering rule files: [.claude/rules/dev/](../../../.claude/rules/dev/) — secrets, auth, logging, blob attachments, record access, performance, testing
- Repo: https://github.com/ZeusGit1/contract_manager

---

*Document owner: Laura Sros (Analyst). Send corrections / additions to laurasros@gmail.com. Status: ready for infra walkthrough.*
