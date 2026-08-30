# Lab 2 Test Plan and Results

Status: Planned before implementation

Contract source: [specification.md](./specification.md), [api-spec.md](./api-spec.md), and [ui-spec.md](./ui-spec.md)

## 1. Test Strategy

Lab 2 uses Spec-Driven Development, Test DD, and TDD. Each implementation Issue begins by selecting its mapped requirements and Acceptance Criteria, adding the planned failing tests, confirming that they fail for the intended missing behavior, implementing the smallest correct behavior, and refactoring while the relevant tests remain green.

Coverage is layered:

- **Unit:** deterministic business-rule helpers such as Ticket Number format, normalization, validation, and pagination parsing.
- **API/integration:** Express routes with Supertest and an isolated PostgreSQL test database through Prisma.
- **UI component:** React Testing Library with mocked API boundaries for state, validation, accessibility, and interaction behavior.
- **UI style:** assertions for required semantic classes/attributes and token-based component states.
- **Responsive:** Playwright at desktop, tablet, and mobile viewports, including overflow checks.
- **E2E:** a real client, server, and test database covering the complete requester journey and ownership boundaries.
- **Visual/manual:** approved screenshot comparison and the checklist in `ui-spec.md`.

Test data must be deterministic and isolated. API tests create their own Requesters and Tickets or reset a dedicated test schema; they must not rely on a developer's local seed state except in explicit seed-verification tests. Attachment tests use generated small fixture files and a temporary test storage directory that is removed after the suite.

## 2. Planned Tests

`Planned` means the test is approved but not yet implemented. Final status is updated only from the final `main` branch.

| Test ID | Type | Requirement / AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-08, BR-09, AC-04 | Ticket Number generator format and collision retry | Valid `TKT-YYYYMMDD-XXXXXXXX`; retry succeeds or safe failure after limit | `server/tests/lab-02/ticket-number.unit.test.ts` | Planned |
| UNIT-02 | Unit | BR-11-BR-16, AC-05, AC-25 | Ticket normalization and validation boundaries | Trimmed valid values accepted; blank, short, long, enum, and inactive references rejected | `server/tests/lab-02/ticket-validation.unit.test.ts` | Planned |
| UNIT-03 | Unit | BR-20-BR-25, AC-09 | Ticket-list query parser | Defaults and permitted values normalize; invalid values return field errors | `server/tests/lab-02/ticket-query.unit.test.ts` | Planned |
| UNIT-04 | Unit | BR-27-BR-30, BR-35, AC-14-AC-16, AC-18 | Attachment type, size, count, safe-basename, signature, and reason rules | Exact boundaries and approved extension/MIME/magic-byte mappings pass; traversal, control, empty, overlong, mismatch, and malformed cases fail safely | `server/tests/lab-02/attachment-validation.unit.test.ts` | Planned |
| UNIT-05 | Unit | BR-18, AC-06 | Canonical Ticket request and idempotency hash | Fixed key order, UUID/enum casing, Unicode NFC, CRLF-to-LF, trimming, and preserved internal whitespace produce deterministic SHA-256; a meaningful field change changes the hash | `server/tests/lab-02/ticket-idempotency.unit.test.ts` | Planned |
| API-01 | API | FR-02, FR-07, FR-32, BR-02, AC-01, AC-24, AC-25 | Active Requesters, Categories, Related Systems, and injected lookup failures | Only active rows returned in documented order/shapes; each unexpected lookup failure returns a safe code/message without database details | `server/tests/lab-02/reference-data.api.test.ts` | Planned |
| API-02 | API | FR-01-FR-06, BR-03, AC-02 | Missing, malformed, inactive, and valid requester context | Invalid context rejected with documented `400`; valid context reaches handler | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-03 | API | FR-08-FR-10, AC-04 | Valid Ticket creation | `201`; one owned Ticket saved with number, timestamps, `NEW`, null IT Priority, and matching values | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-04 | API | FR-09, BR-11-BR-16, AC-05, AC-25 | Create Ticket validation table | `400` field errors; zero Ticket rows created | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-05 | API | FR-11, BR-17-BR-18, AC-06 | Sequential and concurrent Ticket idempotency | Same key/canonical hash replays original; changed hash returns `409`; two concurrent same-key requests create exactly one Ticket and the loser returns replay rather than `500` | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-06 | API | FR-13, BR-39-BR-40, AC-07, AC-24 | Safe Ticket-create failure | Generic error and correlation ID; no stack, SQL, or private details | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-07 | API | FR-14, FR-32, BR-04-BR-07, AC-08, AC-24 | My Tickets ownership, pagination metadata, and injected failure | Only selected Requester's Tickets returned with accurate metadata; unexpected list failure returns a safe error without query/database details | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-08 | API | FR-15-FR-16, BR-20-BR-24, AC-09 | Search, each filter, sort, secondary order, and page boundaries | Deterministic documented subset/order, including priority asc `LOW, MEDIUM, HIGH` and desc reverse | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-09 | API | BR-25, AC-09 | Invalid ticket-list queries | `400 INVALID_QUERY_PARAMETER` with field errors | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-10 | API | FR-19, FR-21, FR-32, AC-11, AC-24 | Owned Ticket Detail and injected failure | `200` read-only data shape with owned Attachment metadata; unexpected detail failure returns a safe error without database details | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-11 | API | FR-20, BR-05-BR-06, AC-12 | Missing and cross-requester Ticket Detail | Same safe `404`; response contains no Ticket data | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-12 | API | FR-22-FR-24, FR-32, BR-27-BR-33, AC-13, AC-24 | Valid Attachment upload/metadata and injected storage failure | `201` safe metadata after storage; private path absent; unexpected storage/DB failure uses safe error and leaves no residue | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-13 | API | FR-23, BR-27-BR-30, AC-14-AC-15 | Unsafe filename, unsupported/mismatched extension-MIME-signature, malformed magic bytes, and oversized files | `400`, `415`, or `413` as contracted; no metadata, temporary file, or final-file residue | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-14 | API | BR-29, BR-33, AC-16 | Five-active and concurrent Attachment boundary | Sixth rejected `409`; replacement accepted after removal; with four active and two concurrent uploads exactly one returns `201`, one returns `409`, final active count is five, and no orphan remains | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-15 | API | FR-24-FR-25, FR-32, BR-31-BR-32, BR-37, AC-17, AC-24 | Active metadata/download, no-preview contract, and injected byte failure | Correct metadata/headers/bytes and no `canPreview`/preview route; private path absent; unavailable/unexpected byte failure is safe | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-16 | API | FR-26-FR-27, FR-32, BR-35-BR-37, AC-18-AC-19, AC-24 | Soft removal, removed access, and injected removal failure | Metadata retained; valid reason saved; download returns safe `404`; unexpected removal failure returns safe error and does not partially remove | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-17 | API | FR-28, BR-38, AC-20 | Cross-requester Attachment operations | Metadata, download, and removal return same safe `404` | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-18 | Integration | BR-33-BR-34, AC-21 | Attachment storage/database compensation | Ticket survives failed upload; failed metadata leaves no new stored file; successful uploads remain | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| UI-01 | UI | FR-01-FR-06, FR-32, AC-01-AC-03, AC-24 | Requester selector states, route guard, selection, Change Requester, and unexpected failure | Required text/states render; Continue works; switch clears old data; safe failure exposes no backend detail and Retry works | `client/tests/lab-02/RequesterSelection.test.tsx` | Planned |
| UI-02 | UI | FR-07-FR-09, AC-07, AC-25 | Create Ticket reference-data loading and failure | Database values render; inactive values absent; safe retry state preserves entered text | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-03 | UI | FR-08-FR-09, AC-05 | Submit disabled during reference loading, enabled after loading even when invalid, and client validation for Ticket fields/Attachment selection | Attempted invalid submit shows linked errors; create API is not called | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-04 | UI | FR-10-FR-12, BR-18, AC-04, AC-06 | Create busy/success and idempotency-key lifecycle | Submit disabled while pending; retries retain the key for unchanged canonical data; post-send edit or terminal action rotates it; official number/backend values shown once | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-05 | UI | FR-13, BR-19, AC-07, AC-24 | Create API failure preservation | Safe error; editable values and valid selected files retained | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-06 | UI | BR-34, AC-21 | Partial Attachment upload after Ticket create | Ticket success retained; each failed file identified with Retry | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-07 | UI | FR-14-FR-18, FR-32, AC-08-AC-10, AC-24 | My Tickets loaded, loading, empty, no-results, expected failure, and unexpected safe failure | Correct distinct states/results/actions; unexpected error exposes no backend detail and Retry retains current query controls | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-08 | UI | FR-15-FR-16, AC-09 | Search/filter/sort/page interactions | Documented query generated; filter/page interactions reset correctly | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-09 | UI | FR-19-FR-21, FR-32, AC-11-AC-12, AC-24 | Ticket Detail loading, owned data, not-found, and unexpected failure | Read-only information and separate Attachment section; safe not-found; unexpected error exposes no backend detail and Retry works | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| UI-10 | UI | FR-22-FR-27, FR-32, AC-13-AC-19, AC-24 | Attachment active, uploading, unsafe/invalid, failed, unavailable-file, removed, no-preview, and unexpected-failure states | Unavailable keeps safe metadata with badge/message, exposes no bytes/private detail, retains Retry Download and Remove; other states show correct controls, no Preview, reason dialog, safe errors, and retained removal metadata | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-11 | UI | FR-28, AC-20 | Attachment ownership failure feedback | Safe not-found/failure state with no leaked metadata | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| STYLE-01 | UI style | FR-29, FR-31, AC-23 | Required labels, asterisks, field states, button hierarchy, badges, and ARIA | Required semantic attributes/classes and visible state text present | `client/tests/lab-02/ZenGreenStyles.test.tsx` | Planned |
| E2E-01 | E2E | AC-01-AC-11 | Complete create-to-detail flow | Select Requester, create, receive official number, find in list, open read-only detail | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-03, AC-08, AC-12, AC-20 | Multi-requester ownership flow | Switching hides prior data; direct Ticket and Attachment access rejected | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-13-AC-21 | Attachment lifecycle | Add, reject invalid, enforce limit, download, remove with reason, retain metadata, block removed download | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| RESP-01 | Responsive | AC-22-AC-23 | Desktop, tablet, and mobile required screens | No clipping, overlap, hidden actions, or horizontal overflow; keyboard checks pass | `e2e/lab-02/responsive-visual.spec.ts` | Planned |
| VIS-01 | Visual/manual | AC-22-AC-23 | Zen Green screenshot checklist | Approved screenshots and completed checklist match `ui-spec.md` | `docs/lab-02/ui-spec.md` and `artifacts/lab-02/screenshots/` | Planned |

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Planned evidence |
|---|---|
| AC-01 | API-01, UI-01, E2E-01 |
| AC-02 | API-02, UI-01, E2E-01 |
| AC-03 | UI-01, E2E-02 |
| AC-04 | UNIT-01, API-03, UI-04, E2E-01 |
| AC-05 | UNIT-02, API-04, UI-03 |
| AC-06 | UNIT-05, API-05, UI-04 |
| AC-07 | API-06, UI-02, UI-05 |
| AC-08 | API-07, UI-07, E2E-02 |
| AC-09 | UNIT-03, API-08, API-09, UI-08 |
| AC-10 | UI-07, E2E-01 |
| AC-11 | API-10, UI-09, E2E-01 |
| AC-12 | API-11, UI-09, E2E-02 |
| AC-13 | API-12, UI-10, E2E-03 |
| AC-14 | UNIT-04, API-13, UI-10, E2E-03 |
| AC-15 | UNIT-04, API-13, UI-10, E2E-03 |
| AC-16 | UNIT-04, API-14, UI-10, E2E-03 |
| AC-17 | API-15, UI-10, E2E-03 |
| AC-18 | UNIT-04, API-16, UI-10, E2E-03 |
| AC-19 | API-16, UI-10, E2E-03 |
| AC-20 | API-17, UI-11, E2E-02 |
| AC-21 | API-18, UI-06, E2E-03 |
| AC-22 | RESP-01, VIS-01 |
| AC-23 | STYLE-01, RESP-01, VIS-01 |
| AC-24 | API-01, API-06, API-07, API-10, API-12, API-15, API-16, UI-01, UI-05, UI-07, UI-09, UI-10 |
| AC-25 | UNIT-02, API-01, API-04, UI-02 |

## 4. Responsive and Visual Checklist

The authoritative checklist and screenshot names are in [ui-spec.md](./ui-spec.md). Automated responsive checks shall run at:

- Desktop: 1440 by 900.
- Tablet: 834 by 1112.
- Mobile: 390 by 844.

At each viewport, Playwright checks `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, required actions are visible/operable, and long Ticket/Attachment values do not force page overflow. Screenshot review remains required because automated DOM assertions do not prove visual quality.

## 5. Test Commands

Planned final commands from repository root:

```powershell
npm test
npm run test:e2e
npm run build:server
npm run build:client
```

Planned database preparation uses the documented isolated test database command added by the data-foundation Issue. Production/development data must never be cleared by automated tests.

## 6. Baseline and Final Results

### Lab 1 Baseline on 2026-08-30

| Check | Result |
|---|---|
| `npm run build:server` | Pass |
| `npm run build:client` | Pass |
| `npm test` | Environment blocked the database-backed Category API test because PostgreSQL was not running at `localhost:5432`; the endpoint returned its expected safe `500` path. Re-run after the test database is available. |

### Lab 2 Final Results

Not yet executed. This section must record the final `main` commit, commands, test-file/test counts, pass status, and screenshot verification after implementation and release integration.

## 7. Known Limitations or Deferred Tests

- Real authentication and role authorization are deferred to Lab 3. `X-Requester-Id` tests verify Lab 2 ownership behavior, not security against a malicious client choosing another seeded identity.
- IT Staff workflow, IT Priority changes, comments, notes, Actions Taken, and post-creation status transitions are outside Lab 2.
- Antivirus scanning, cloud-object storage, and production retention/purge testing are outside Lab 2.
- Visual regression baselines must be approved after the first implementation; they must not be generated and accepted without human inspection.
