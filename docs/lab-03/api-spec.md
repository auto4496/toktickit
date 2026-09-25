# Lab 3 REST API Contract

Status (2026-09-25): Approved contract, implemented through PRs #32–34 and under integrated verification in Issue #29. Base `/api`; JSON except multipart uploads and binary downloads. Complements [specification.md](./specification.md); supersedes Lab 2 identity and IT Priority defaults only where explicitly stated. This verification increment adds failure/rollback evidence without changing endpoint contracts.

## 1. Authentication, transport and CSRF

- Session cookie: `toktickit.sid=<opaque token>; HttpOnly; SameSite=Lax; Path=/`, no Domain. Max-Age 28800 (900 while initial-password change is pending). HTTPS uses Secure; only explicit loopback local development/test can disable it. A non-loopback insecure configuration must fail startup.
- Browser calls use `credentials: include`. Configure an exact allowlist from `CLIENT_ORIGIN` (local development `http://localhost:3000`, isolated E2E `http://localhost:3100`); no wildcard credentialed CORS. Never reflect arbitrary origins or trust spoofable proxy IP headers without configured proxy trust.
- Before login, `GET /api/auth/csrf` establishes a separate short-lived, host-only HttpOnly `toktickit.pre-auth` cookie and returns `{csrfToken}`. Keep a server-side association between the random pre-auth cookie digest and token, with 15-minute expiry, in a bounded in-memory store suitable for the single lab process. Expire entries; restart requires a fresh bootstrap. This cookie grants no application access.
- `POST /api/auth/login` requires matching pre-auth cookie/token plus allowed Origin. Successful login destroys pre-auth state, clears its cookie, sets a fresh session cookie and returns session-bound csrfToken. An invalid attempt leaves pre-auth state usable until expiry.
- With a session, `GET /api/auth/csrf` returns its session-bound csrfToken. Store the returned CSRF token only in client memory. All state-changing APIs, including logout/password change/multipart upload, require `X-CSRF-Token` and an exact allowed Origin. Missing/wrong token or Origin -> `403 CSRF_REJECTED`. Direct API tests must send these headers deliberately; CORS alone is not authorization.
- Protected GETs do not mutate business data. All auth/protected JSON and file responses use `Cache-Control: no-store`. No tokens in URLs. A restricted initial-password session can use only me/csrf/change-password/logout.
- Public endpoints: `/`, `/api/health`, pre-auth csrf and login. Reference-data APIs now require a full authenticated session. Legacy `/api/requesters` is removed and returns 404 without an account list.

## 2. Shared validation and safe shapes

UUIDs identify users/tickets/entries/attachments; reference IDs are positive integers; dates are ISO 8601 UTC. Bodies are strict objects: reject unknown keys/invalid types, not coercion of booleans or strings to numbers. JSON size limit 32 KiB; oversized JSON -> 413. Attachment limits remain 5 MiB and five active files.

Authenticate -> password-change gate -> role check -> validate route ID -> authorize resource ownership -> validate operation fields -> transact. Never parse/store an unauthorized multipart file before authorization. Wrong role -> 403 without disclosing whether the resource exists; same-role non-owner and missing Ticket/Attachment -> indistinguishable 404.

| Shape | Exact fields |
|---|---|
| SafeUser | `id,name,email,role,isActive,mustChangePassword,version,createdAt,updatedAt` |
| Person | `id,name,email` (ticket requester); no credentials or sessions |
| Owner | `id,name,role,isActive` or null; inactive historical owners labelled by UI |
| TicketSummary | Existing Lab 2 `id,ticketNumber,ticketDate,summary,category,relatedSystem,requestedPriority,itPriority,currentStatus,updatedAt`, plus `owner,version,requesterResolvedAt` |
| TicketDetail | TicketSummary plus `requester,description,attachments`; no embedded notes/comments or private counts |
| Entry | `id,ticketId,content,author:{id,name,role},createdAt`; no password/email/session data in author |
| UserListItem | SafeUser; passwords/hashes and session/CSRF data are never nested here |
| Page | `{data:[...],meta:{page,pageSize,totalItems,totalPages}}`, totalPages=0 for zero items; beyond-last-page gives an empty data array and true totals |

All unspecified successful object responses use `{data: object}`. Authentication shapes below are explicit exceptions. Reference GETs keep their Lab 2 bare-array shape; `GET /attachments/:attachmentId` keeps its bare metadata object. Requester list metadata retains its additional `sortBy` and `sortDirection` fields; new queue Page metadata also includes these applied sort values. Conversation Page metadata has only the four pagination fields. Mutation Ticket responses return `{data: TicketDetail}`. The Requester DTO is identical in privacy even if a forged role/header/query is supplied.

Error envelope: `{error:{code,message,fieldErrors?,correlationId?}}`. Validation details use safe field names; unexpected errors include correlationId and generic message. Log operation/correlation and sanitized cause, never submitted passwords, cookies, tokens or private notes. Do not leak Prisma/SQL, filesystem paths or stack traces in responses.

## 3. Authentication endpoints

| Method / route | Request | Success | Specific failures |
|---|---|---|---|
| GET `/auth/csrf` | Pre-auth or session cookie if present | 200 `{csrfToken}` plus pre-auth cookie if unauthenticated | 500 AUTH_UNAVAILABLE |
| POST `/auth/login` | `{email,password}`, pre-auth CSRF headers/cookie | 200 `{user:SafeUser,csrfToken}`; sets fresh session | 400 VALIDATION_FAILED, 401 INVALID_CREDENTIALS, 403 CSRF_REJECTED, 429 AUTH_RATE_LIMITED |
| GET `/auth/me` | Session cookie | 200 `{user:SafeUser}` | 401 AUTH_REQUIRED |
| POST `/auth/change-password` | `{currentPassword,newPassword,confirmPassword}`, session CSRF | 200 `{user:SafeUser,csrfToken}`; revoke old sessions, set fresh full session | 400 VALIDATION_FAILED, 400 CURRENT_PASSWORD_INVALID, 429 AUTH_RATE_LIMITED |
| POST `/auth/logout` | Empty object, session or pre-auth CSRF | 204, revoke identified session and clear auth/pre-auth cookies | 403 CSRF_REJECTED; client may bootstrap pre-auth CSRF for idempotent logout of an absent/expired session |

Login returns mustChangePassword; the client computes the destination from role and that flag, never an external redirect URL. Password validation/hash/session/rate limits are BR-07 through BR-12. For the password-change limiter, use the session token hash; a successful change rotates it. Expired/revoked/inactive-account sessions -> 401 AUTH_REQUIRED; full application APIs with restricted session -> 403 PASSWORD_CHANGE_REQUIRED.

## 4. Authenticated Lab 2 continuation

| Method / route | Role | Preserved behavior / deliberate change |
|---|---|---|
| GET `/categories`, `/related-systems` | Any full role | Existing active-reference arrays; historical detail still resolves inactive references. |
| POST `/tickets` | Requester | Existing create body, Idempotency-Key, canonical hash/transaction/replay 201/200 and validation; requester ID from session; owner=null, itPriority=requestedPriority, version=1, requesterResolvedAt=null, status=NEW. |
| GET `/tickets` | Requester | Existing own-list queries/defaults/shape, plus eight accepted currentStatus values and additive workflow fields. |
| GET `/tickets/:ticketId` | Requester, own | Existing detail/404 behavior, additive workflow fields. |
| POST `/tickets/:ticketId/attachments` | Requester, own | Existing multipart field `file`, validation, compensation, metadata response; session/CSRF instead of requester header. |
| GET `/attachments/:attachmentId` | Requester own; Staff/Admin any | Existing safe metadata/removed state. |
| GET `/attachments/:attachmentId/download` | Requester own; Staff/Admin any | Existing active-byte download, safe Content-Disposition, removed/unavailable failures; no inline preview. |
| DELETE `/attachments/:attachmentId` | Requester, own | Existing `{reason}` 5-200 chars, explicit confirmation UI, retained removal metadata and `{data:AttachmentMetadata}` response. Response field remains `removalReason`. |

Existing create Summary 5-120, Description 10-2,000 and requested priority LOW/MEDIUM/HIGH remain. Preserve deterministic creation-key semantics and per-ticket attachment locking. `requesterId`, author/time/status/priority overrides in create body -> 400 VALIDATION_FAILED. An otherwise valid request with a forged `X-Requester-Id` still uses the session identity.

Requester GET query: `search` up to 100 normalized trimmed characters (empty means no search), `categoryId`, `requestedPriority`, `currentStatus`, `sortBy` one of createdAt/updatedAt/ticketNumber/requestedPriority, `sortDirection` asc/desc, `page` >=1, `pageSize` 10/20/50. Defaults updatedAt desc, ticketNumber desc tie-break, page 1/size 10. Priority rank LOW=1, MEDIUM=2,HIGH=3. Unknown/duplicate/invalid query keys return 400 VALIDATION_FAILED. Valid numeric category without a row -> 400; inactive historical category remains filterable.

## 5. Queue and operational detail

| Method / route | Roles | Result |
|---|---|---|
| GET `/staff/tickets` | IT Staff, Administrator | 200 Page<TicketSummary>; Admin read-only lookup |
| GET `/staff/tickets/:ticketId` | IT Staff, Administrator | 200 `{data:TicketDetail}` |
| GET `/staff/eligible-owners` | IT Staff | 200 `{data:[{id,name,role}]}` active IT_STAFF/ADMINISTRATOR, name asc then id asc |

Queue query contract:

| Key | Allowed values/default |
|---|---|
| search | Trimmed 0-100 chars; empty omitted; case-insensitive contains ticketNumber/summary/description |
| categoryId | Existing positive integer, including historical inactive category |
| currentStatus | One of the eight enum values, optional |
| itPriority | LOW/MEDIUM/HIGH, optional |
| owner | `all` (default), `unassigned`, `me`, or existing user UUID; inactive historical owners may be filtered |
| sortBy | `updatedAt` (default), `createdAt`, `ticketNumber`, `itPriority` |
| sortDirection | desc (default) or asc |
| page / pageSize | 1 / 10 defaults; page >=1, size 10/20/50 |

AND all supplied filters; search fields are OR. Priority uses numeric business rank. Tie-break is ticketNumber desc unless ticketNumber is already primary (unique). Reject unknown/repeated keys, malformed UUIDs, nonexistent category/owner references and invalid enum/numeric values with 400 VALIDATION_FAILED. Totals apply the exact query and come from a consistent database read; beyond-last-page is valid empty data. Do not add dashboards or unfiltered global counts to Requester responses.

## 6. Ticket mutations and concurrency

| Method / route | Authorized role | Exact body | Success / special failures |
|---|---|---|---|
| POST `/staff/tickets/:ticketId/claim` | IT Staff | `{expectedVersion}` | 200 detail; 409 if assigned, stale or terminal |
| PATCH `/staff/tickets/:ticketId/owner` | IT Staff | `{ownerId:UUID\|null,expectedVersion,confirmed:true}` | 200 detail; 400 ineligible owner, 409 if stale/terminal/clear disallowed |
| PATCH `/staff/tickets/:ticketId/priority` | IT Staff, Admin | `{itPriority,expectedVersion}` | 200 detail; 400 invalid enum, 409 stale/terminal |
| PATCH `/staff/tickets/:ticketId/status` | IT Staff | `{currentStatus,expectedVersion,confirmed?:boolean}` | 200 detail; 400 invalid enum/missing required confirmation; 409 forbidden edge/same-state/owner precondition/stale |
| POST `/tickets/:ticketId/resolution-indication` | Requester own | `{expectedVersion}` | 200 detail; 409 stale/disallowed state; same-version repeat returns existing result |

expectedVersion is a positive safe integer. Stable 409 codes: TICKET_CONFLICT (version/claim race), TICKET_READ_ONLY (terminal mutation), INVALID_STATUS_TRANSITION, ACTIVE_OWNER_REQUIRED, OWNER_CLEAR_NOT_ALLOWED, RESOLUTION_INDICATION_NOT_ALLOWED. Owner UUID that is missing/inactive/wrong role returns 400 OWNER_NOT_ELIGIBLE without unrelated user details. These errors are evaluated only after actor/resource authorization. A confirmed flag is a contract acknowledgment, not a replacement for authorization.

Mutations use transaction/row lock or compare-and-swap on the ticket version and check current target-user eligibility under the shared account advisory lock. Account changes use that same lock so eligibility cannot change between check and commit. Lock order is account advisory lock, then ticket row; all owner-sensitive transitions follow it. This handles concurrent deactivation/reassignment/resolve without deadlock-prone inconsistent lock ordering.

## 7. Comments and notes

| Method / route | Role | Request / response |
|---|---|---|
| GET `/tickets/:ticketId/comments` | Requester own; Staff/Admin any | page/pageSize -> 200 Page<Entry> |
| POST `/tickets/:ticketId/comments` | Requester own; IT Staff any | `{content}` -> 201 `{data:Entry}` |
| GET `/tickets/:ticketId/internal-notes` | IT Staff, Admin | page/pageSize -> 200 Page<Entry> |
| POST `/tickets/:ticketId/internal-notes` | IT Staff | `{content}` -> 201 `{data:Entry}` |

Page defaults 1/20; allowed sizes 10/20/50. Order createdAt asc then id asc. Invalid/unknown/duplicate query keys -> 400. Content rules BR-21; terminal append -> 409 TICKET_READ_ONLY. Create entry and update ticket.updatedAt atomically while checking terminal state under the ticket lock. Note endpoints deny Requester before fetching entries or counts. Editing/deleting either resource is absent (404). If posting fails ambiguously, UI refreshes conversation and retains the draft; no automatic retry/deduplication guarantee for append-only posts is claimed.

## 8. Administrator users

| Method / route | Exact request | Result |
|---|---|---|
| GET `/admin/users` | `search` trimmed 0-100 chars name/email contains; optional `role` enum | 200 `{data:[SafeUser]}` sorted name asc, id asc; no pagination |
| POST `/admin/users` | `{name,email,role,isActive,initialPassword}` | 201 `{data:SafeUser}`, mustChangePassword=true |
| PATCH `/admin/users/:userId` | `{name,email,role,isActive,expectedVersion}` (complete editable form) | 200 `{data:SafeUser}` |
| POST `/admin/users/:userId/initial-password` | `{initialPassword,confirmPassword,expectedVersion}` | 200 `{data:SafeUser}`, mustChangePassword=true, revoke sessions |

All require full Admin role + CSRF. Validate BR-07/08, exact role and booleans; duplicate normalized email -> 409 EMAIL_ALREADY_EXISTS (including concurrent unique-constraint violation). Missing target -> 404 RESOURCE_NOT_FOUND. Stale version -> 409 USER_CONFLICT. Safety codes: 409 SELF_DEACTIVATION_FORBIDDEN, LAST_ACTIVE_ADMIN_REQUIRED, USER_HAS_ACTIVE_TICKETS. Unsupported deletion -> 404. Clear password inputs after success/unmount; never return initialPassword or passwordHash. An admin resetting their own initial password receives the safe response but their revoked cookie is cleared and the UI returns to login. Own role changes similarly return the safe result and end the session.

## 9. Status and implementation checks

200 read/update/replay; 201 create/append; 204 logout; 400 invalid input; 401 unauthenticated/expired/bad credentials; 403 forbidden/password gate/CSRF; 404 missing or non-owned resource; 409 state/concurrency/account conflict; 413 request/file too large; 415 unsupported attachment mapping; 429 throttled with Retry-After; 500 safe unexpected error.

Endpoint errors inherited from Lab 2 attachments/create remain stable unless the authenticated-context replacement is explicitly documented. All protected error cases must be tested via direct HTTP as well as relevant UI states. Actual implementation changes to this contract and its mapped tests belong in the same reviewed PR.
