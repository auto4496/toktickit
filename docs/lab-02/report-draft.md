# TokTickIT Lab 2 Engineering Report

> Status: Complete on 2026-09-02. Issues #11-#17 are Done, [PR #22](https://github.com/auto4496/toktickit/pull/22) was reviewer-merged as `73c0ecb`, and peer reviewer `@Datakung` merged final [release PR #23](https://github.com/auto4496/toktickit/pull/23) into `main` as `a0a4d32`. Final-main tests and builds passed.

| Item | Evidence |
|---|---|
| Course | CPE 334 - Introduction to Software Engineering in the Age of AI Agents, Semester 1/2026 |
| Project | TokTickIT - Requester Ticketing MVP with UI Foundation |
| Student | Phanuwit Butchari - 67070501070 - [@auto4496](https://github.com/auto4496) |
| Peer reviewer | Pitchai Chadchuangchot - 67070501068 - [@Datakung](https://github.com/Datakung) |
| Repository | [auto4496/toktickit](https://github.com/auto4496/toktickit) |
| Submission | Final report prepared 2026-09-02 |

## Answer Part 1

### Git Use with Engineering Workflow

The sprint uses `main` -> `lab2-staging` -> one feature branch per Issue -> peer-reviewed PR back to `lab2-staging` -> one final release PR to `main`. The PR author does not merge their own feature PR. GitHub Project uses Backlog, Specified, Started, PR Review, Fixing, and Done.

| Increment | Issue / branch | PR and reviewer outcome |
|---|---|---|
| Engineering Contract | [#11](https://github.com/auto4496/toktickit/issues/11) / `feature/lab2-1-engineering-contract` | [PR #12](https://github.com/auto4496/toktickit/pull/12), reviewer-merged as `2bcdb54` |
| Data and Requester Context | [#13](https://github.com/auto4496/toktickit/issues/13) / `feature/lab2-2-data-requester-context` | [PR #18](https://github.com/auto4496/toktickit/pull/18), reviewer-merged as `9ab607d` |
| Create Ticket | [#14](https://github.com/auto4496/toktickit/issues/14) / `feature/lab2-3-create-ticket` | [PR #19](https://github.com/auto4496/toktickit/pull/19), reviewer-merged as `8f78ab7` |
| My Tickets | [#15](https://github.com/auto4496/toktickit/issues/15) / `feature/lab2-4-my-tickets` | [PR #20](https://github.com/auto4496/toktickit/pull/20), approved by `@Datakung`, reviewer-merged as `4f82246` |
| Ticket Detail and Attachments | [#16](https://github.com/auto4496/toktickit/issues/16) / `feature/lab2-5-ticket-detail-attachments` | [PR #21](https://github.com/auto4496/toktickit/pull/21), approved by `@Datakung`, reviewer-merged as `05c6cc8` |
| Quality and Release Evidence | [#17](https://github.com/auto4496/toktickit/issues/17) / `feature/lab2-6-quality-evidence` | [PR #22](https://github.com/auto4496/toktickit/pull/22), approved at `93eca5d`, reviewer-merged as `73c0ecb` |
| Final release | `lab2-staging` -> `main` | [PR #23](https://github.com/auto4496/toktickit/pull/23), peer reviewer-merged as `a0a4d32` |

Working evidence: [GitHub Project](https://github.com/users/auto4496/projects/1), [reviewer.md](https://github.com/auto4496/toktickit/blob/main/docs/lab-02/reviewer.md), [README.md](https://github.com/auto4496/toktickit/blob/main/README.md), and [.gitignore](https://github.com/auto4496/toktickit/blob/main/.gitignore). All Issues #11-#17 are closed and Done. I also reviewed [Datakung/toktickit PR #22](https://github.com/Datakung/toktickit/pull/22), requested fixes for unsafe E2E database reuse and tracked screenshot overwrites, verified the corrections at `8ae59ec`, and approved it before merge as `4dfb0f2`.

## Answer Part 2

### Spec DD

The approved [Sprint Engineering Specification](https://github.com/auto4496/toktickit/blob/main/docs/lab-02/specification.md) defines FR-01-FR-32, BR-01-BR-43, AC-01-AC-25, data design, scope boundaries, assumptions, and a two-part Definition of Done. The contract was completed in Issue #11 and reviewer-merged in PR #12 before the implementation PRs.

Key decisions include backend ownership constraints on every requester-scoped query; safe identical 404 responses for missing and non-owned resources; backend-generated Ticket Numbers; canonical idempotency for Ticket creation; signature/MIME/extension Attachment validation; five-active Attachment admission under a database lock; private generated storage names; and test-database isolation.

The specification explicitly excludes authentication, IT Staff workflow, status changes after creation, comments, Internal Notes, Actions Taken, and inline Attachment Preview. Commit/PR evidence proving the contract preceded implementation is linked through [PR #12](https://github.com/auto4496/toktickit/pull/12).

## Answer Part 3

### Test DD and Traceability

The version-controlled [Test Plan and Results](https://github.com/auto4496/toktickit/blob/main/docs/lab-02/tests.md) maps every acceptance criterion to named unit, API, UI, responsive, visual, and E2E tests with actual file paths. No required test is skipped or disabled.

| Quality gate on Issue #17 branch | Actual result on 2026-09-02 |
|---|---|
| `npm test` against isolated `toktickit_test` | Pass - 23 files / 165 tests |
| `npm run test:e2e` | Pass - 2 files / 7 tests |
| E2E-01 | Create, locate in My Tickets, open owned detail |
| E2E-02 | Change Requester and reject direct cross-requester access |
| E2E-03 | Invalid/limit/download/soft-removal Attachment lifecycle |
| RESP-01 | Pass at 1440x900, 834x1112, and 390x844 |
| VIS-01 | Required and supplementary evidence captured and manually inspected |
| `npm run build:server` / `npm run build:client` | Pass / Pass |
| `git diff --check` | Pass |

Test-first failures were retained as engineering evidence: Attachment traversal/control-character tests failed before safe-basename behavior; retry tests exposed an unintended duplicate POST before request separation; reviewer cases exposed missing cleanup/compensation, ownership-before-validation, attachment-state, and focus-trap coverage; and the Windows Playwright setup failed on `prisma.cmd` before it was changed to invoke Prisma through `node.exe`.

Automated setup validates `TEST_DATABASE_URL`, refuses the development URL, deploys migrations only to the guarded test database, clears only E2E-owned Tickets and their related Attachment/create-request rows, and uses private ignored test storage. Routine E2E screenshots go to ignored `test-results/`; only `npm run test:e2e:capture` refreshes curated evidence. The same complete suite passed again on merged `main` at `a0a4d32`.

## Answer Part 4

### AI Use with Reflection

OpenAI Codex, a GPT-5-based coding agent, supported labsheet analysis, contract drafting, test design, implementation, failure diagnosis, peer-review corrections, evidence capture, and report preparation. The full 10-prompt table and verification notes are in [ai-use.md](https://github.com/auto4496/toktickit/blob/main/docs/lab-02/ai-use.md).

Representative prompts covered: contract ambiguity review; Engineering Contract creation; test-database isolation; Development Requester context; Create Ticket test-first implementation; My Tickets ownership/querying; PR #20 corrections; Ticket Detail/Attachment lifecycle; PR #21 corrections; and final E2E/responsive/release audit.

### My Reflection

AI accelerated translation from a broad stakeholder request into traceable requirements and helped expose edge cases such as concurrent Attachment admission, safe not-found behavior, stale requester data, and Windows test-runner differences. It was most useful when each task was constrained by an approved document and a named test ID. It was least reliable when a passing assertion could be mistaken for complete evidence or when UI copy and reviewer workflow details were inferred too quickly. I therefore treated AI output as a proposal, not proof: I checked diffs, ran isolated PostgreSQL tests, inspected screenshots, verified GitHub state, and required peer approval. In the next sprint I would prepare the evidence matrix and screenshot states at the start, reducing late report work and making completion auditable throughout the sprint.

## Answer Part 5

### Development Requester Select Screen

The selector loads active Requesters from PostgreSQL, clearly states that it is a testing mechanism rather than authentication, disables Continue until selection, preserves the selected Requester, displays that identity in the shell, and provides Change Requester. Loading, ready, empty, and safe failure/Retry states are covered by UI tests and browser evidence.

![Development Requester loading state](../../artifacts/lab-02/screenshots/requester-selection/desktop-loading.png)
![Development Requester safe failure and Retry](../../artifacts/lab-02/screenshots/requester-selection/desktop-failure.png)
![Development Requester ready state](../../artifacts/lab-02/screenshots/requester-selection/desktop-ready.png)

## Answer Part 6

### Working Ticket Screen: Create Mode

Create Ticket uses database-backed Category and Related System values, shows the selected Requester, and marks Ticket Number, Ticket Date, and IT Priority as read-only/system values. Frontend and backend validation agree on the documented bounds. The backend creates exactly one requester-owned Ticket with `NEW`, null IT Priority, an official Ticket Number, and a canonical idempotency record. The success screen renders saved response values, not optimistic client values.

The evidence below covers the required initial, validation failure, invalid Attachment, submitting, safe API failure with preserved values, and success states.

![Create Ticket initial state](../../artifacts/lab-02/screenshots/create-ticket/desktop-initial.png)
![Create Ticket field validation failure](../../artifacts/lab-02/screenshots/create-ticket/desktop-validation.png)
![Create Ticket invalid Attachment](../../artifacts/lab-02/screenshots/create-ticket/desktop-invalid-attachment.png)
![Create Ticket submitting state](../../artifacts/lab-02/screenshots/create-ticket/desktop-submitting.png)
![Create Ticket safe API failure with retained values](../../artifacts/lab-02/screenshots/create-ticket/desktop-api-failure.png)
![Create Ticket success with backend Ticket Number](../../artifacts/lab-02/screenshots/create-ticket/desktop-success.png)

API-03-API-06 verify saved `requesterId`, server defaults, validation, deterministic Ticket Number uniqueness, idempotent replay/conflict, and concurrent duplicate prevention. UI-02-UI-05 verify accessibility, reference failures, selected-file rules, busy protection, retry preservation, key rotation, and official saved values.

## Answer Part 7

### Working My Tickets Screen

`GET /api/tickets` requires `X-Requester-Id` and includes ownership in the database query. It supports Summary/Ticket Number/Description search; Category, Requested Priority, and Current Status filters; all documented sort fields/directions; explicit priority rank; deterministic Ticket Number secondary order; one-based pagination; and safe query validation.

The desktop/tablet table and mobile cards expose equivalent essential information. Loading, first-use empty, filtered no-results, out-of-range, loaded, and safe failure states are distinct. Search/filter/sort/page changes reset page as specified; Clear Filters restores defaults. Changing from Requester A to Requester B clears A's rows before the new request.

![Requester A owned Ticket list](../../artifacts/lab-02/screenshots/my-tickets/desktop-loaded.png)
![Requester B after Change Requester](../../artifacts/lab-02/screenshots/my-tickets/desktop-requester-switched.png)
![Filtered no-results state](../../artifacts/lab-02/screenshots/my-tickets/desktop-no-results.png)
![Mobile Ticket cards](../../artifacts/lab-02/screenshots/my-tickets/mobile-cards.png)

UNIT-03, API-07-API-09, UI-07, UI-08, and E2E-02 prove query parsing, deterministic ordering, metadata, ownership, requester switching, no stale data, keyboard-accessible Create/View actions, and identical rejection of cross-requester direct access.

## Answer Part 8

### Working Ticket Screen: View Mode and Attachments

Owned Ticket Detail returns read-only current values and safe Attachment metadata without storage paths/keys. Missing and non-owned Tickets/Attachments return the same safe 404 envelope. Attachment admission checks ownership before validation details and rechecks inside a locked transaction.

Allowed files require a safe basename and matching JPG/JPEG, PNG, WEBP, or PDF extension, declared MIME type, and signature; each is at most 5 MiB and each Ticket has at most five active files. Downloads use safe headers. Soft removal requires confirmation and a 3-200 character reason, retains metadata, disables Download, and does not expose Preview.

![Owned Ticket Detail with active Attachments](../../artifacts/lab-02/screenshots/ticket-detail/desktop-active-attachments.png)
![Soft-removed Attachment with retained metadata](../../artifacts/lab-02/screenshots/ticket-detail/desktop-removed-attachment.png)
![Unavailable active file with safe Retry state](../../artifacts/lab-02/screenshots/ticket-detail/desktop-unavailable-attachment.png)

API-10-API-18 and E2E-03 cover upload, filename/MIME/signature/size boundaries, five-active concurrency, download, unavailable files, cleanup/compensation, soft removal, blocked removed download, no Preview route, and cross-requester Ticket/Attachment access. UI-09-UI-10 cover adding, downloading, invalid/uploading/failed/unavailable/removed states, retry, focus trap, Escape, and focus restoration.

## Answer Part 9

### Zen Green UI and Responsive Evidence

The rendered [UI Specification and Visual Checklist](https://github.com/auto4496/toktickit/blob/main/docs/lab-02/ui-spec.md) defines primary green `#006B3C`, secondary green `#0B7A46`, pale green `#EAF6EF`, near-white page background, dark charcoal-green text, white editable fields, shaded read-only values, red error treatment, amber warning use, visible focus, button hierarchy, spacing, table/card behavior, and non-color state labels.

RESP-01 passed at desktop 1440x900, tablet 834x1112, and mobile 390x844. Manual inspection found no clipped labels, overlap, hidden primary action, unreadable filename, or horizontal document overflow. All actions retain visible focus and practical touch targets.

![Create Ticket tablet layout](../../artifacts/lab-02/screenshots/create-ticket/tablet.png)
![Create Ticket mobile layout](../../artifacts/lab-02/screenshots/create-ticket/mobile.png)
![My Tickets tablet table](../../artifacts/lab-02/screenshots/my-tickets/tablet.png)
![My Tickets mobile cards](../../artifacts/lab-02/screenshots/my-tickets/mobile-cards.png)
![Ticket Detail tablet layout](../../artifacts/lab-02/screenshots/ticket-detail/tablet.png)
![Ticket Detail mobile layout](../../artifacts/lab-02/screenshots/ticket-detail/mobile.png)

The repository contains 13 contract-required screenshots plus 11 supplementary grading-state screenshots under `artifacts/lab-02/screenshots/`. The final PDF will retain representative readable images and working repository links; the full evidence directory remains the source of truth.

### Final Release Status

| Final evidence | Current verified value |
|---|---|
| Issue #17 PR / approval / reviewer merge | PR #22 approved at `93eca5d`; reviewer-merged as `73c0ecb` |
| Release-candidate `lab2-staging` baseline | `73c0ecb` when release PR opened |
| Release PR `lab2-staging` -> `main` | PR #23 peer reviewer-merged on 2026-09-02 |
| Final `main` commit | `a0a4d32` |
| Final-main Vitest / Playwright result | Pass - 23 files / 165 tests; 7 E2E tests |
| Final-main builds / diff check | Server Pass; Client Pass; `git diff --check` Pass |
| All Issues #11-#17 Done and closed | Complete |
