# Lab 3 Test Plan and Traceability

Status: Planned before implementation. No test listed here has been run as a Lab 3 test. Planned paths become actual evidence only when files and results exist.

Contract: [specification.md](./specification.md), [api-spec.md](./api-spec.md), [ui-spec.md](./ui-spec.md).

## 1. Test-first workflow and environment

Each feature Issue selects mapped FR/BR/AC/Test IDs, writes tests that fail for the intended missing behavior, records a concise red result, implements, then refactors with green tests. Plan tests before or alongside implementation, not after reading generated tests. Changes to requirements and planned assertions are reviewed together; no weakening authorization or migration tests to manufacture green results.

Use existing Vitest, Supertest, React Testing Library and Playwright. Database tests use the existing TEST_DATABASE_URL guard and a dedicated test database distinct from development. Migration fixtures use a separate temporary guarded database/schema with Lab 2 data and isolated upload storage; never reset development. Test setup/teardown must reject unsafe URLs/paths before destructive operations. Hash tests use real configured costs in focused cases; unrelated UI tests may mock HTTP. API/security tests must not bypass authentication/authorization middleware.

## 2. Planned tests

Every row initially has Final = Planned. Multiple test cases within a row cover its full expected-result statement, not just one happy path.

| Test ID | Type | AC | What it tests / expected result | Planned automated file | Final |
|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-03 | Email/name normalization, 15/128 code-point and 512-byte password boundaries, no truncation, confirmation, whitespace and real salted scrypt verification; wrong passwords fail. | server/tests/lab-03/auth.unit.test.ts | Planned |
| UNIT-02 | Unit | AC-03, AC-04 | Fixed-window limits and expiry with controlled clock, safe dummy-hash path, random session/digest generation and restricted/full expiry. | server/tests/lab-03/auth.unit.test.ts | Planned |
| UNIT-03 | Unit | AC-10 | Strict queue keys/types/duplicates, rank ordering, pagination and deterministic tie-break parsing. | server/tests/lab-03/staff-query.unit.test.ts | Planned |
| UNIT-04 | Unit | AC-12, AC-14, AC-15 | Enumerate all eight-by-eight status pairs, owner/terminal/confirmation preconditions and requester indication states. | server/tests/lab-03/ticket-workflow.unit.test.ts | Planned |
| UNIT-05 | Unit | AC-16, AC-17, AC-18 | Comment normalization/length and admin fields/one-role validation including Unicode and unknown properties. | server/tests/lab-03/validation.unit.test.ts | Planned |
| API-01 | API | AC-01, AC-03 | Active valid login; unknown/wrong/inactive same safe 401; normalized email; invalid body and failed-attempt 429/Retry-After. | server/tests/lab-03/auth.api.test.ts | Planned |
| API-02 | API | AC-02, AC-03 | Initial-password gate on every protected endpoint; correct change, wrong current password, mismatch, same-password and exact boundaries; token rotation. | server/tests/lab-03/auth.api.test.ts | Planned |
| API-03 | API | AC-04 | me/logout/idempotent logout/expiration and old-cookie rejection after change/reset/role/activity changes; cookie flags, no-store, no secrets. | server/tests/lab-03/auth.api.test.ts | Planned |
| API-04 | Security/API | AC-04, AC-05 | Pre-auth and session CSRF, missing/wrong token/Origin, credentialed CORS allowlist, hostile Origin and legacy header-only attempts. | server/tests/lab-03/authorization.api.test.ts | Planned |
| API-05 | Security/API | AC-05, AC-09, AC-17 | Table-driven full role/operation matrix incl. Admin's limited detail/priority rights; owned/non-owned/missing ticket/file; response/private-count leakage; requester header/body spoof. | server/tests/lab-03/authorization.api.test.ts | Planned |
| API-06 | API | AC-10 | Search each field, AND filters, each owner mode, priority ranks both ways, each sort/ties, pages/totals/out-of-range, invalid/unknown/repeated params. | server/tests/lab-03/staff-queue.api.test.ts | Planned |
| API-07 | API | AC-11, AC-12 | Safe detail/eligible owners, claim and reassign/clear; reject inactive/wrong-role targets and terminal/clear-state violations; preserve requester identity. | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-08 | Concurrency/API | AC-12, AC-13, AC-14 | Two independent requests claim/update same version: one succeeds, loser 409, no overwrite/500; owner deactivate versus assign/start/resolve uses shared lock. | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-09 | API | AC-13, AC-14 | Priority changes by Staff/Admin only; requested priority unchanged; every status edge, confirmation and active-owner prerequisite enforced by real API. | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-10 | API | AC-15 | Owned indication, permitted/disallowed states, no status change, repeat/current versus stale version, reopen clearing and non-owner denial. | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-11 | API | AC-16, AC-17 | Append/list public and internal entries, author/time from server, Unicode/blank/length/HTML-as-text, deterministic pages, terminal writes, absent edit/delete and no Requester note leakage. | server/tests/lab-03/comments-notes.api.test.ts | Planned |
| API-12 | API | AC-18 | Admin list name/email search, role filter/no-results, create and complete edit, email normalization, duplicate/invalid email/role/types and concurrent duplicate creation. | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-13 | API | AC-19 | Initial-password issuance/reset including self-reset, force change, immediate old-session invalidation and no password/hash in response/log. | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-14 | Concurrency/API | AC-20 | Self-deactivation/last-admin/stale-edit protection; simultaneous demotions/deactivations still leave one active Admin; assigned-user deactivation/demotion conflicts; actor rechecked after lock. | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-15 | Failure/API | AC-21 | Inject auth/queue/detail/conversation/admin database failures; safe 500/correlation and no sensitive output; transactional updates roll back. | server/tests/lab-03/safe-errors.api.test.ts | Planned |
| MIG-01 | Migration/integration | AC-06 | Apply staged migration to populated Lab 2 fixture; compare IDs/counts/FKs/create-request hashes/attachment metadata and byte checksums; backfill priority and mandatory-change credentials. | server/tests/lab-03/migration.integration.test.ts | Planned |
| MIG-02 | Migration/integration | AC-06 | Normalized email collisions/missing credential map fail without data loss; interrupted initializer resumes; final non-null constraints hold. | server/tests/lab-03/migration.integration.test.ts | Planned |
| MIG-03 | Seed/integration | AC-07 | Seed twice, edit password/account/ticket between runs; preserve edits and relationships, satisfy active/inactive role counts and meaningful queue/conversation distribution. | server/tests/lab-03/seed.integration.test.ts | Planned |
| REG-01 | Regression/API | AC-05, AC-08 | Rework Lab 2 create/list/detail tests to authenticated agents: ownership, validation, concurrent idempotency, filters and historical references preserved. | server/tests/lab-03/requester-regression.api.test.ts | Planned |
| REG-02 | Regression/API | AC-09 | Authenticated attachment MIME/signature/filename/size/count/concurrent-upload/compensation/removal/unavailable lifecycle; exact file hashes, Staff/Admin read-only access, authorization before storage. | server/tests/lab-03/attachments-regression.api.test.ts | Planned |
| UI-01 | UI | AC-01, AC-03, AC-21, AC-23 | Login fields/show password/validation/busy/generic invalid and inactive feedback/rate limit/failure; submit focus and labels. | client/tests/lab-03/Login.test.tsx | Planned |
| UI-02 | UI | AC-02, AC-03, AC-21, AC-23 | Mandatory-change guard, rules/confirmation/current-password error, busy/success/failure, no bypass and permitted ordinary back navigation. | client/tests/lab-03/ChangePassword.test.tsx | Planned |
| UI-03 | UI | AC-04, AC-05, AC-08 | Session bootstrap/expiry/logout failure/success, role links, validated return path and cache clearing; remove legacy selector/storage and never replay mutation after login. | client/tests/lab-03/ApplicationShell.test.tsx | Planned |
| UI-04 | UI | AC-10, AC-21, AC-23 | Queue controls, pagination/reset, loading/empty/no-results/failure, matching-query retained data, explicit detail link and keyboard usability. | client/tests/lab-03/StaffTicketQueue.test.tsx | Planned |
| UI-05 | UI | AC-11, AC-12, AC-13, AC-14, AC-21 | Detail fields, owner/priority/status controls, confirmations, Admin restriction, active/removed/unavailable files, read-only/forbidden/not-found/failure/conflict. | client/tests/lab-03/StaffTicketDetail.test.tsx | Planned |
| UI-06 | UI | AC-16, AC-17, AC-21, AC-23 | Separate drafts/private notice, escaping malicious content, post busy/failure/uncertain retry, history pagination and keyboard tabs; no Admin composer. | client/tests/lab-03/StaffTicketDetail.test.tsx | Planned |
| UI-07 | UI | AC-08, AC-09, AC-15, AC-17 | Requester detail/public comments/indication state and unchanged actual status, attachment continuity; no internal-note controls/data. | client/tests/lab-03/RequesterTicketDetail.test.tsx | Planned |
| UI-08 | UI | AC-18, AC-19, AC-20, AC-21, AC-23 | Admin list/search/filter/create/edit/reset, password clearing, inline safety/duplicate/conflict errors, own session invalidation, dialog focus/discard behavior. | client/tests/lab-03/UserManagement.test.tsx | Planned |
| STYLE-01 | UI style | AC-22, AC-23 | Shared Zen Green tokens, primary/readonly/badge/error/focus conventions, private composer separation and absence of excluded controls. | client/tests/lab-03/ZenGreenStyles.test.tsx | Planned |
| RESP-01 | Responsive | AC-22, AC-23 | Table/card/panel stacking and long labels/filenames/descriptions at 1440/834/390 and 320 widths; no page overflow and usable actions. | e2e/lab-03/responsive-visual.spec.ts | Planned |
| E2E-01 | E2E | AC-01, AC-02, AC-03, AC-04, AC-05 | Real login/invalid/inactive/first-change/logout; old-cookie API access rejected; all role landing pages and restricted links. | e2e/lab-03/authentication.spec.ts | Planned |
| E2E-02 | E2E | AC-08, AC-09, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17 | Requester creates with attachment; Staff searches/claims/changes priority/status/posts public/private; Requester sees public only and indicates resolution; Staff resolves/closes/reopens. | e2e/lab-03/staff-ticket-flow.spec.ts | Planned |
| E2E-03 | E2E | AC-04, AC-18, AC-19, AC-20 | Admin creates/edits/resets user; user forced to change; duplicate/self/last-admin/assigned-owner guards; non-Admin denial. | e2e/lab-03/user-administration.spec.ts | Planned |
| VIS-01 | Visual/manual + capture | AC-21, AC-22, AC-23 | Capture all ui-spec scenes at three viewports and inspect hierarchy/privacy/states/focus/clipping/overlap; record per-scene result and correction. | e2e/lab-03/responsive-visual.spec.ts + docs/lab-03/ui-spec.md | Planned |
| REL-01 | Release/manual | AC-24 | Run full guarded suite/builds on final main; map real outputs/screenshots/PRs/commit and nine PDF parts; check links and all Issues Done only on completion. | docs/lab-03/tests.md + docs/lab-03/reviewer.md | Planned |

## 3. Feature ownership and regression policy

Work item 2 owns UNIT-01/02, API-01..05 for its implemented endpoints, MIG-01..03, REG-01/02 and UI-01..03. Work item 3 owns UNIT-03..05 (conversation portion), API-06..11, UI-04..07. Work item 4 owns admin UNIT-05, API-12..14 and UI-08. Each feature extends API-02/04/05 with its newly introduced protected endpoints and implements its API-15 failure cases, style and responsive checks. AC-05's complete role/operation matrix is only marked Pass once all endpoint increments are integrated; the foundation PR records its narrower implemented coverage explicitly. Work item 5 completes cross-feature E2E/visual checks, not a delayed first pass at feature tests. Work item 6 owns REL-01.

Old Lab 2 selector/header-specific assertions become obsolete and are replaced explicitly. Preserve all still-relevant tests and update their login setup/expected initial IT Priority deliberately; document replacements so deleted selector tests cannot hide lost requester/attachment protection. Existing Lab 1 category/system UI assumptions may need authenticated setup; health remains public. Unchanged tests must keep running.

## 4. Verification commands and evidence

Planned commands use existing root scripts: `npm test`, `npm run test:e2e`, `npm run build:server`, `npm run build:client`, `git diff --check`. Feature-specific filters may be used during red/green cycles. Add a separate explicit Lab 3 screenshot capture script in work item 5 without changing routine test runs to overwrite curated evidence.

For each result record date, full commit SHA, branch, test-only database identifier (no credentials), command, test file/case counts, exit status and artifact path. A failed/skipped/environment-blocked check is recorded as such. Hashing/rate-limit time may be controlled in tests through clocks/adapters, but one real crypto path and actual middleware/transaction coverage remain mandatory.

### Contract-only validation (work item 1)

Required checks: numbered IDs unique; every AC referenced by at least one planned test; internal Markdown links resolve; six Issue scopes cover all FR and tests; endpoint roles/status rules align across documents; no claimed feature/test/peer approval before it exists. No runtime tests are required for these documentation-only edits; this does not establish application readiness.

### Final execution record

Pending implementation and final-main verification. All rows above remain Planned; no screenshots or passing feature results exist yet.
