# Lab 2 Sprint Engineering Specification

Status: Draft for team review before implementation

Source: CPE 334 Lab 2 labsheet, "TokTickIT Requester Ticketing MVP with UI Foundation"

## 1. Sprint Goal

Deliver a professional, responsive Requester-facing TokTickIT MVP in which a selected Development Requester can create an IT support ticket, receive an official backend-generated Ticket Number, find and inspect only their own tickets, and manage permitted attachments. The sprint also establishes reusable Zen Green UI conventions, an explicit REST contract, a traceable automated-test plan, and evidence-based completion rules for later labs.

## 2. Stakeholder Request Interpretation

Lab 2 turns the Lab 1 technical foundation into the first usable requester journey. Because real authentication is deferred to Lab 3, the application begins with a clearly labelled Development Requester Selection screen. The selected requester is sent as temporary test context on requester-scoped API requests. This context supports multi-requester ownership demonstrations but is not a security boundary and must not be presented as login or authorization.

The delivered journey is:

1. Select an active Development Requester.
2. Create a validated ticket using database-backed reference data.
3. Receive the official Ticket Number and creation result from the backend.
4. Find the ticket in a searchable, filterable, sortable, paginated My Tickets view.
5. Open an owned ticket in a read-only Ticket Detail view.
6. Upload, inspect, download, and soft-remove permitted attachments.
7. Change requester and observe that requester-owned data is reloaded and isolated.

## 3. Scope

### Included

- Development Requester model, idempotent seed data, active-requester API, selection screen, persisted client context, selected-requester display, and Change Requester behavior.
- Database-backed active Categories and Related Systems.
- Create Ticket API and responsive UI with frontend and backend validation, duplicate-submission prevention, safe failure handling, and an official Ticket Number.
- My Tickets API and responsive UI with requester ownership, search, filters, sorting, pagination, loading, empty, no-results, and error states.
- Requester Ticket Detail API and responsive read-only UI.
- Attachment metadata, upload, active download, preview eligibility, and soft removal with a reason.
- Ownership checks for Ticket and Attachment operations.
- Zen Green application shell, reusable controls, field states, badges, feedback, responsive layouts, and accessibility rules.
- Unit, API/integration, UI component, UI style, responsive, visual, and end-to-end test evidence.
- GitHub Issues, feature branches, peer-reviewed Pull Requests through `lab2-staging`, release integration, and required repository documentation.

### Excluded

- Real login, logout, passwords, password hashing, sessions, tokens, authenticated identities, and role-based authorization.
- IT Staff dashboard, queue, claiming, reassignment, IT Priority changes, or other staff workflow.
- Public Comments, Internal Notes, and Actions Taken.
- Ticket lifecycle transitions beyond the initial `NEW` status, including resolve, close, reopen, and cancel.
- Administrator management of users, roles, requesters, Categories, or Related Systems.
- Virus scanning, cloud-object storage, outbound notifications, and production-grade retention policies.

## 4. Functional Requirements

### Development Requester Context

- **FR-01:** The application shall show the Development Requester Selection screen before any requester-scoped screen can be used when no requester is selected.
- **FR-02:** The selector shall load only active Development Requesters from PostgreSQL through the REST API.
- **FR-03:** The selector shall provide loading, empty, and safe API-failure states.
- **FR-04:** The application shell shall display the selected Requester and provide a Change Requester action.
- **FR-05:** Changing Requester shall clear requester-scoped cached data and reload the destination screen for the new context.
- **FR-06:** The UI shall state that Development Requester selection is a Lab 2 testing mechanism and not authentication.

### Ticket Creation

- **FR-07:** The Create Ticket screen shall load active Categories and active Related Systems from the API.
- **FR-08:** The screen shall display Ticket Number, Ticket Date, Requester, and IT Priority as read-only values or placeholders and shall capture Category, Related System, Summary, Requested Priority, Description, and optional Attachments.
- **FR-09:** The client and server shall validate the same required fields, allowed values, lengths, and reference-data activity rules.
- **FR-10:** The server shall generate and persist a unique official Ticket Number and set the initial Current Status to `NEW`.
- **FR-11:** The client shall prevent duplicate submission while a create request is pending.
- **FR-12:** A successful creation shall show the official Ticket Number, saved values, and actions to view the Ticket or create another Ticket.
- **FR-13:** A failed creation shall show a safe error and retain valid user-entered form values.

### My Tickets

- **FR-14:** The My Tickets API shall return only tickets owned by the selected Development Requester context.
- **FR-15:** My Tickets shall support search, Category, Requested Priority, and Current Status filters.
- **FR-16:** My Tickets shall support documented sorting and one-based pagination with response metadata.
- **FR-17:** My Tickets shall provide loading, first-use empty, filtered no-results, and safe failure states.
- **FR-18:** Each ticket result shall provide enough information and an accessible action to open Ticket Detail.

### Ticket Detail and Ownership

- **FR-19:** Ticket Detail shall return and display one owned Ticket with current values shown as read-only.
- **FR-20:** A Ticket belonging to another Requester shall not be returned through list, detail, or direct API access.
- **FR-21:** Ticket Detail shall visually separate Ticket information from Attachment actions.

### Attachments

- **FR-22:** A Requester shall be able to upload a permitted Attachment during the post-create success flow or from an owned Ticket Detail screen.
- **FR-23:** Attachment validation shall enforce permitted type, size, active-count, ownership, and safe filename rules.
- **FR-24:** The system shall expose Attachment metadata for an owned Ticket, including removed metadata where applicable.
- **FR-25:** A Requester shall be able to download an active owned Attachment.
- **FR-26:** A Requester shall be able to soft-remove an active owned Attachment after confirmation and provision of a removal reason.
- **FR-27:** A removed Attachment shall retain metadata but shall not be downloadable or previewable.
- **FR-28:** Attachment operations against another Requester's Ticket or Attachment shall not disclose the resource.

### Presentation and Feedback

- **FR-29:** The application shall use the Zen Green tokens and reusable component states defined in [ui-spec.md](./ui-spec.md).
- **FR-30:** Create Ticket, My Tickets, Ticket Detail, and Requester Selection shall remain usable at desktop, tablet, and mobile widths.
- **FR-31:** Required controls and feedback shall be keyboard accessible and understandable without reliance on color alone.
- **FR-32:** Unexpected API errors shall use safe user-facing messages and shall not expose stack traces, storage paths, or database details.

## 5. Business Rules

### Identity and Ownership

- **BR-01:** Lab 2 uses a Development Requester selector instead of login. The selected identity is test context only and is not authentication.
- **BR-02:** Only active Requesters appear in the selector. An inactive or unknown Requester ID is rejected for requester-scoped operations.
- **BR-03:** Requester-scoped requests use the temporary `X-Requester-Id` HTTP header. The client shall not describe this header as a secure identity mechanism.
- **BR-04:** A Ticket belongs to exactly one Requester, and its `requesterId` cannot be changed in Lab 2.
- **BR-05:** Ticket and Attachment queries apply ownership constraints in the backend query, not only in the UI.
- **BR-06:** Missing and non-owned Ticket or Attachment resources return the same safe `404` response so ownership checks do not reveal another Requester's data.
- **BR-07:** Changing the selected Requester invalidates client-side requester-scoped query results before new data is displayed.

### Ticket Defaults and Validation

- **BR-08:** The backend generates the official Ticket Number; the client cannot supply or modify it.
- **BR-09:** Ticket Numbers use `TKT-YYYYMMDD-XXXXXXXX`, where the date uses the server's UTC creation date and `XXXXXXXX` is an uppercase eight-character hexadecimal value derived from a cryptographically random UUID. A database unique constraint is authoritative, and a collision is retried up to three times.
- **BR-10:** A new Ticket begins with Current Status `NEW`, unassigned (`null`) IT Priority, and server-generated `createdAt` and `updatedAt` timestamps. Lab 2 provides no operation for changing IT Priority.
- **BR-11:** Category and Related System are required and must reference active rows that exist when the Ticket is created.
- **BR-12:** Requested Priority is required and is one of `LOW`, `MEDIUM`, or `HIGH`.
- **BR-13:** Summary is trimmed, required, and must contain 5-120 characters after trimming.
- **BR-14:** Description is trimmed, required, and must contain 10-2,000 characters after trimming.
- **BR-15:** Blank-only Summary, Description, or removal reason values are invalid.
- **BR-16:** Frontend validation improves feedback but never replaces backend validation.
- **BR-17:** The Submit button is disabled while creation is pending. The server remains responsible for preventing unintended duplicates through idempotency.
- **BR-18:** One client-generated UUID `Idempotency-Key` represents one logical Ticket submission. The client creates it after frontend validation passes and immediately before the first POST, stores the pending key with the canonical payload in session storage, and retains it for network/timeout and `5xx` retries of that unchanged payload. The client rotates the key after a successful `2xx`, Cancel/Clear/Create Another, or any edit to a canonical field after a request was sent. The canonical request hash is SHA-256 over UTF-8 JSON with fixed key order: canonical lowercase `requesterId`, integer `categoryId`, integer `relatedSystemId`, Summary normalized to Unicode NFC and trimmed, uppercase `requestedPriority`, and Description normalized to Unicode NFC with CRLF converted to LF and leading/trailing whitespace trimmed; internal whitespace is otherwise preserved. The server atomically reserves `(requesterId, idempotencyKey)` in the same database transaction that creates the Ticket and completes the reservation. It uses `INSERT ... ON CONFLICT DO NOTHING RETURNING id`, not an uncaught unique-constraint exception: PostgreSQL waits for a concurrent conflicting insert to commit or roll back. The transaction that receives an inserted ID creates the single Ticket and completes its reservation; a transaction that receives no ID reads the committed reservation and returns the original Ticket as a `200` replay when the hash matches or `409` when it differs. If the first transaction rolls back, its reservation disappears and the waiting insert succeeds, so no concurrent loser becomes a `500`.
- **BR-19:** A failed Ticket create request does not clear entered fields or selected valid files.

### Search, Filtering, Sorting, and Pagination

- **BR-20:** Search is case-insensitive, trimmed, limited to 100 characters, and matches Ticket Number, Summary, and Description.
- **BR-21:** Supported filters are `categoryId`, `requestedPriority`, and `currentStatus`.
- **BR-22:** Supported sort fields are `createdAt`, `updatedAt`, `ticketNumber`, and `requestedPriority`; supported directions are `asc` and `desc`. Requested Priority uses business rank `LOW = 1`, `MEDIUM = 2`, and `HIGH = 3`, so ascending is `LOW -> MEDIUM -> HIGH` and descending is the reverse. The API implements this rank explicitly and does not rely on alphabetical, UI-label, or database-enum order.
- **BR-23:** Default sorting is `updatedAt desc` with `ticketNumber desc` as a deterministic secondary sort.
- **BR-24:** Pagination is one-based. Default `page` is 1, default `pageSize` is 10, and permitted page sizes are 10, 20, and 50.
- **BR-25:** Invalid query parameters return `400` with field-specific details; they are not silently ignored.
- **BR-26:** A Requester with no tickets sees an empty state. A valid query that matches no owned tickets sees a distinct no-results state with a Clear Filters action.

### Attachments

- **BR-27:** Permitted file mappings are JPG/JPEG (`image/jpeg`, bytes start `FF D8 FF`), PNG (`image/png`, bytes start `89 50 4E 47 0D 0A 1A 0A`), WEBP (`image/webp`, `RIFF` at bytes 0-3 and `WEBP` at bytes 8-11), and PDF (`application/pdf`, bytes start `%PDF-`). Extension comparison is case-insensitive and canonicalized to lowercase. The server rejects a file unless extension, declared multipart MIME type, and detected magic-byte signature all match one permitted mapping; client-provided MIME type alone is never trusted.
- **BR-28:** Maximum Attachment size is 5 MiB (5 * 1024 * 1024 bytes) per file.
- **BR-29:** A Ticket may have at most five active Attachments. Removed Attachments do not count toward this limit.
- **BR-30:** The server derives the display name by stripping all `/` and `\\` path segments to a basename, normalizing it to Unicode NFC, trimming surrounding whitespace, and removing NUL, C0 control characters (`U+0000-U+001F`), and DEL (`U+007F`). It rejects an empty name, `.` or `..`, a name without a basename before the extension, or a normalized name longer than 255 UTF-8 bytes. Original case is retained for the safe display basename, but the approved extension is compared case-insensitively. The display name is never used as a storage path; stored filenames use a generated UUID plus the canonical lowercase extension under a server-controlled directory.
- **BR-31:** Attachment metadata includes ID, Ticket ID, original name, stored name, MIME type, byte size, storage key, uploader Requester ID, upload timestamp, removal timestamp, removal reason, and remover Requester ID.
- **BR-32:** Storage keys and server filesystem paths are never returned to clients.
- **BR-33:** Upload streams first to a unique server-controlled temporary file while enforcing the byte limit, then validates ownership, filename, extension, declared MIME type, and magic-byte signature. The metadata transaction locks the owned Ticket row with `SELECT ... FOR UPDATE`, counts active Attachments while holding that per-Ticket lock, rejects a sixth active file, moves the validated temporary file to its final UUID storage name, inserts metadata, and commits before releasing the lock. Concurrent uploads to the same Ticket are therefore serialized. A request rejected after temporary storage deletes its temporary file; any move, insert, or commit failure rolls back metadata and performs best-effort cleanup of temporary and newly moved final files, with cleanup failure logged for operational repair.
- **BR-34:** Ticket creation and Attachment uploads use separate API operations. If the Ticket is created but one or more uploads fail, the Ticket remains saved, successful uploads remain active, and the UI reports each failed file with a Retry action.
- **BR-35:** Soft removal requires explicit confirmation and a trimmed reason of 5-200 characters.
- **BR-36:** Soft removal sets `removedAt`, `removalReason`, and `removedByRequesterId`; it does not delete the Attachment row or physical file in Lab 2.
- **BR-37:** Lab 2 provides no inline Attachment preview endpoint or Preview control for any file type. Active Attachments provide safe metadata and Download only. Removed Attachment metadata remains visible with a Removed badge, removal date, and reason, but Download is unavailable and the byte endpoint returns the safe not-found response.
- **BR-38:** Upload, metadata, download, and removal operations require ownership of the parent Ticket.

### Failure and Safety

- **BR-39:** Expected validation failures use the standard API error envelope and field errors defined in [api-spec.md](./api-spec.md).
- **BR-40:** Unexpected failures are logged server-side with operational context but return only a generic message and correlation ID.
- **BR-41:** The UI distinguishes validation, loading, empty, no-results, success, and unexpected-failure states.
- **BR-42:** Active reference-data rows already used by a Ticket remain readable in historical Ticket Detail even if later made inactive; inactive rows cannot be selected for a new Ticket.
- **BR-43:** Lab 3 shall replace `X-Requester-Id` with authenticated server identity without changing Ticket ownership relationships.

## 6. UI Specification Summary

The detailed visual and interaction contract is in [ui-spec.md](./ui-spec.md).

- Application shell: TokTickIT identity, My Tickets, Create Ticket, selected Requester display, Change Requester, active-page state, and responsive navigation.
- Requester Selection: labelled testing-only explanation, active-requester dropdown, Continue button, loading, empty, and failure states.
- Create Ticket: system values separated from editable inputs, consistent labels and required markers, inline validation, attachment selection, busy submission, failure preservation, and success confirmation.
- My Tickets: search, filters, sort, Clear Filters, pagination, Create Ticket action, desktop table, mobile cards, status/priority badges, and all data states.
- Ticket Detail: read-only ticket information, back navigation, and a distinct Attachment section with active, uploading, invalid, removed, and failed states.
- Breakpoints: desktop `>= 992px`, tablet `768-991px`, and mobile `< 768px`.

## 7. Data Changes

### Proposed Models

| Model | Key fields and decisions |
|---|---|
| `RequesterUser` | `id` UUID PK, `name`, `email` unique, `isActive`, `createdAt`, `updatedAt`. Replaces the unused Lab 1 `User` model with an explicit temporary requester concept. |
| `Category` | Existing integer PK and unique `name`; add `isActive` and `updatedAt`. |
| `RelatedSystem` | Integer PK, unique `name`, `isActive`, timestamps. |
| `Ticket` | UUID PK, unique `ticketNumber`, `requesterId`, `categoryId`, `relatedSystemId`, `summary`, `requestedPriority`, nullable read-only `itPriority`, `description`, `currentStatus`, timestamps. |
| `TicketCreateRequest` | UUID PK, `requesterId`, `idempotencyKey`, canonical SHA-256 `requestHash`, unique nullable `ticketId`, `createdAt`, and `completedAt`; reservation and Ticket creation commit atomically. |
| `Attachment` | UUID PK, `ticketId`, original/stored names, MIME type, size, private storage key, `uploadedByRequesterId`, timestamps, nullable removal fields. |

### Enums

- `Priority`: `LOW`, `MEDIUM`, `HIGH`; used by required Requested Priority and nullable IT Priority.
- `TicketStatus`: `NEW` only for Lab 2; later values are intentionally deferred.

### Relationships

- One `RequesterUser` owns many `Ticket` records.
- Each `Ticket` belongs to one `RequesterUser`, one `Category`, and one `RelatedSystem`.
- One `Ticket` has many `Attachment` records.
- Requester relationships record who uploaded and who removed an Attachment.

### Constraints and Indexes

- Unique: Requester email, Category name, Related System name, Ticket Number.
- Idempotency: composite unique index on `TicketCreateRequest(requesterId, idempotencyKey)` and unique index on nullable `ticketId`.
- My Tickets: indexes on `(requesterId, updatedAt)`, `(requesterId, currentStatus, updatedAt)`, `(requesterId, requestedPriority, updatedAt)`, and `(requesterId, categoryId, updatedAt)`.
- Attachment lookup: index on `(ticketId, removedAt)`.
- Required foreign keys use restrictive deletion. Lab 2 does not hard-delete Requesters, Tickets, or Attachments.

### Migration Decision

The Lab 1 `User` model is unused by application behavior, so the Lab 2 migration will replace it with `RequesterUser` before production data exists. Ticket ownership remains a dedicated foreign key so Lab 3 can connect authenticated users without changing ticket history. The migration and generated Prisma Client must be reviewed in the data-foundation Pull Request.

## 8. API Contract

The detailed REST contract is in [api-spec.md](./api-spec.md). Required capabilities are:

| Capability | Endpoint |
|---|---|
| Active Categories | `GET /api/categories` |
| Active Related Systems | `GET /api/related-systems` |
| Active Development Requesters | `GET /api/requesters` |
| Create Ticket | `POST /api/tickets` |
| Owned Ticket list | `GET /api/tickets` |
| Owned Ticket Detail | `GET /api/tickets/:ticketId` |
| Attachment upload | `POST /api/tickets/:ticketId/attachments` |
| Attachment metadata | `GET /api/attachments/:attachmentId` |
| Active Attachment download | `GET /api/attachments/:attachmentId/download` |
| Attachment soft removal | `DELETE /api/attachments/:attachmentId` |

All requester-scoped endpoints require `X-Requester-Id`. The API uses JSON except multipart upload and binary download. Successful list responses include pagination metadata. All failures use a consistent safe error envelope.

## 9. Acceptance Criteria

- **AC-01:** Given active and inactive seeded Requesters, when the selector loads, then only active Requesters are available and the testing-only explanation is visible.
- **AC-02:** Given no selected Requester, when a requester-scoped route is opened, then the Requester Selection screen is shown instead of requester data.
- **AC-03:** Given Requester A is selected, when the user changes to Requester B, then A's cached tickets disappear before B's data is displayed.
- **AC-04:** Given valid Ticket data, when the Requester submits once, then one Ticket is saved with the matching `requesterId`, `NEW` status, server timestamp, and official Ticket Number.
- **AC-05:** Given reference data has loaded and Ticket fields are missing, blank, invalid, or out of range, when the enabled Submit Ticket action is selected, then client validation shows linked field-level errors, the create API is not called, and no Ticket is saved.
- **AC-06:** Given two sequential or concurrent create requests use the same Requester and idempotency key, when their canonical hashes match, then exactly one Ticket is created and the other request returns the original Ticket as a replay; when hashes differ, the second request returns `409`. The client retains or rotates the key according to BR-18.
- **AC-07:** Given Category, Related System, or create APIs fail, when Create Ticket is used, then a safe error is shown and valid entered values remain available.
- **AC-08:** Given Requester A is selected, when My Tickets loads, then only A's tickets and correct pagination metadata are returned.
- **AC-09:** Given owned tickets with varied values, when search, filters, sorting, or pagination are applied, then the documented deterministic subset and order are returned, including Requested Priority ascending as `LOW`, `MEDIUM`, `HIGH` and descending in the reverse order.
- **AC-10:** Given no owned tickets or no matches, when My Tickets loads, then the correct distinct empty or no-results state is shown.
- **AC-11:** Given an owned Ticket, when Ticket Detail is opened, then its current values are displayed read-only with Attachment metadata.
- **AC-12:** Given Requester B is selected, when a Ticket belonging to Requester A is requested directly, then the API returns the safe not-found response and no Ticket data.
- **AC-13:** Given an owned Ticket and a file whose safe basename, size, extension, declared MIME type, and magic-byte signature satisfy the permitted mapping, when uploaded, then one active Attachment is stored under a UUID name and only safe metadata is displayed.
- **AC-14:** Given an unsafe filename, disallowed or mismatched extension/MIME/signature combination, or malformed content signature, when selected or uploaded, then it is rejected and no Attachment metadata or stored-file residue is created.
- **AC-15:** Given a file larger than 5 MiB, when uploaded, then the API rejects it with the documented size error.
- **AC-16:** Given five active Attachments, when a sixth is uploaded, then it is rejected; after one is soft-removed, one replacement upload is permitted. Given four active Attachments and two concurrent valid uploads, exactly one succeeds, one returns the limit conflict, the final active count is five, and no temporary or final orphan file remains.
- **AC-17:** Given an active owned Attachment, when Download is selected, then the saved bytes are returned with a safe content disposition. If active metadata exists but the stored file is unreadable, then `404 ATTACHMENT_FILE_UNAVAILABLE` leaves the metadata row visible with an `Unavailable` badge and safe message, offers Retry Download and Remove, and exposes no bytes or private storage detail. No active or removed Attachment exposes an inline Preview control or preview endpoint in Lab 2.
- **AC-18:** Given an active owned Attachment and a valid removal reason, when removal is confirmed, then removal metadata is saved and retained in Ticket Detail.
- **AC-19:** Given a removed Attachment, when its metadata is displayed or its download URL is requested directly, then removal metadata remains visible, no Preview or Download control is offered, and file bytes are not returned.
- **AC-20:** Given Requester B is selected, when metadata, download, or removal is requested for A's Attachment, then the API returns the safe not-found response.
- **AC-21:** Given a Ticket is created and one subsequent Attachment upload fails, then the Ticket and successful uploads remain saved, failed files are identified, and Retry is available.
- **AC-22:** Given desktop, tablet, and mobile viewports, when all required screens are inspected, then controls remain usable with no clipping, overlap, hidden actions, or horizontal page scrolling.
- **AC-23:** Given keyboard-only navigation or non-color perception, when required workflows are used, then focus, labels, state text, and validation remain understandable and operable.
- **AC-24:** Given an unexpected backend failure, when any screen performs an API request, then a safe message is shown without stack traces, storage paths, or database details.
- **AC-25:** Given an inactive Requester or reference row, when a selection or new Ticket request is made, then the inactive value is unavailable and server validation rejects direct use.

Every Acceptance Criterion maps to at least one planned automated or visual test in [tests.md](./tests.md).

## 10. Definition of Done

### Product Completion

- All approved FR, BR, and AC items in this specification are implemented or explicitly re-approved before implementation changes scope.
- The Prisma schema, migration, seed, REST endpoints, UI, validation, ownership behavior, and responsive behavior conform to the four Lab 2 contract documents.
- All planned unit, API/integration, UI component, UI style, responsive, and E2E tests pass on final `main`.
- Every AC has traceable evidence, every automated test records its actual file path, and no required test is skipped, disabled, commented out, or flaky.
- Safe success, validation, boundary, loading, empty, no-results, ownership, and unexpected-failure behavior is demonstrated.
- Desktop, tablet, and mobile screenshots pass the visual checklist with no clipping, overlap, unreadable attachment names, or horizontal page overflow.
- README setup, migration, seed, run, upload-storage, test, and build instructions are current and reproducible.
- No secrets, local uploads, generated build output, or private storage paths are committed.

### Course Delivery

- Work is decomposed into Lab 2 GitHub Issues using Backlog, Specified, Started, PR Review, Fixing, and Done.
- `lab2-staging` was created from completed Lab 1 `main`; each Issue uses its own feature branch and peer-reviewed PR into staging.
- Each PR is linked to its Issue through GitHub's Development panel; a branch association or body mention alone is insufficient evidence.
- After a change request, the Issue moves to Fixing. The author pushes corrections, replies to every review comment, and only then resolves each addressed thread before returning the Issue to PR Review.
- After approval, the approving peer reviewer, not the PR author, performs the merge into `lab2-staging`.
- Review findings, responses, approvals, and links are recorded in `reviewer.md`.
- Integration is verified on `lab2-staging`, followed by one release PR to `main`.
- `ai-use.md` records the selected LLM, 6-10 meaningful prompts, results, corrections, and a brief personal reflection.
- The submitted concise PDF uses the exact headings Answer Part 1 through Answer Part 9, contains working links and readable evidence, and treats repository `main` as the source of truth.

## 11. Assumptions and Decisions

1. The selected Requester is persisted in browser local storage for refresh continuity, but every requester-scoped response still comes from the backend using the temporary header context.
2. Ownership mismatch uses `404` rather than `403` to avoid revealing that another Requester's Ticket or Attachment exists.
3. Ticket creation and Attachment upload are separate operations. This makes partial upload failure explicit and retryable without deleting a successfully created Ticket.
4. Local private filesystem storage is acceptable for Lab 2. The storage root is configuration-driven, excluded from Git, and replaceable by object storage later.
5. Removed physical files are retained for Lab 2 because the required behavior is soft removal. Production retention and purge policies are deferred.
6. Reference data may become inactive later; historical Ticket display remains stable while new selection is blocked.
7. The initial frontend may introduce route and multipart-upload dependencies only when the implementing Issue documents and reviews them.
8. English is used for UI labels and repository evidence to match the course handout; user-facing text remains concise and accessible.

### Implementation Issue Plan

Six cohesive work items balance traceability with reasonable peer-review effort:

| Order | Work item | Depends on | Completion boundary |
|---:|---|---|---|
| 1 | Engineering Contract | Completed Lab 1 `main` | Four contract documents and living review/AI records are internally consistent and reviewed before feature implementation. |
| 2 | Data and Requester Context | 1 | Prisma migration, idempotent seed, reference APIs, selector/context, and mapped tests work together. |
| 3 | Create Ticket | 2 | Ticket creation API/UI, validation, idempotency, failure preservation, and mapped tests pass. |
| 4 | My Tickets | 2-3 | Owned list, queries, states, responsive representation, and mapped tests pass. |
| 5 | Ticket Detail and Attachments | 2-4 | Owned detail and complete Attachment lifecycle, compensation, and mapped tests pass. |
| 6 | Quality and Release Evidence | 1-5 | Responsive/E2E/visual checks, README, final evidence, and release readiness are complete. |

Each work item uses one feature branch and one peer-reviewed Pull Request into `lab2-staging`. A work item starts from the latest integrated staging commit so the reviewer sees a focused diff and avoidable merge conflicts are minimized.
