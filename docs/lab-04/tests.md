# Lab 4 Test Plan and Traceability

Status: approved contract/data foundation with Issue #42 Actions execution evidence. `Pending` means no passing result has been observed in the staged work items. Use only isolated `TEST_DATABASE_URL` and the Lab 3 guard; never run destructive test setup against the development database.

The matrix retains planned checks for later work items. INT-01/INT-02 and the Actions API/UI checks are implemented; see [data foundation evidence](data-foundation.md) and [Actions evidence](actions.md). Pending filenames remain proposed implementation locations. Local work on separate branches does not imply staged acceptance.

| ID | Type | AC | Check | Expected | Automated file | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | API coverage (planned unit) | AC-03 | Normalize Action text, follow-up and completion fields | Invalid/over-limit rejected | `server/tests/lab-04/actions-taken.api.test.ts`; no separate unit file claimed | Pass through API |
| UNIT-02 | Unit | AC-06 | Every status edge and Action gate decision | Exact matrix/gate | `server/tests/lab-04/ticket-workflow.unit.test.ts` | Pending |
| API-01 | API | AC-01, AC-03 | Create Action, actor/assignee, validation and inactive assignee | Correct data/400 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-02 | API | AC-02 | Own/non-owned Requester reads and write denial | Own only/403/404 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-03 | API | AC-04 | Edit, transition, revisions, stable list order, terminal lock | Ordered history/409 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-04 | API | AC-04, AC-05 | Concurrent stale edit and repeated create key | One winner/one row | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-05 | API | AC-06 | Status matrix, owner/confirmation/version and resolution gate via raw request | Only legal transitions | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-06 | API | AC-07 | Requester counts/window/order/other-user isolation | Database-matching owned data | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pending |
| API-07 | API | AC-08 | Staff/Admin metrics, role denial, deterministic recent list | Exact counts/order/403 | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pending |
| INT-01 | Integration | AC-09 | Migrate Lab 3 fixture and compare counts/FKs; seed twice | No loss/overwrite | `server/tests/lab-03/migration.integration.test.ts` (retained suite extended through Lab 4) | Pass |
| INT-02 | Integration | AC-09 | Back up a Lab 3 fixture and attachment files; trigger controlled migration/validation failure; restore into an isolated recovery target | Baseline records, relationships and attachment checksums preserved | `server/tests/lab-04/migration-recovery.integration.test.ts` | Pass |
| UI-01 | Component | AC-10 | Staff dashboard cards, links, loading/zero/error | Accessible states | `client/tests/lab-04/StaffDashboard.test.tsx` | Pending |
| UI-02 | Component | AC-10 | Requester dashboard ownership display, links, error | Accessible states | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pending |
| UI-03 | Component | AC-01–04, AC-10 | Action read/edit/create, validation, conflict, role visibility | Safe UI states | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-04 | Component | AC-06, AC-10 | Status gate error and refresh | Correct feedback | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pending |
| UI-05 | Component | AC-04, AC-10 | Start visibility by role, Action/Ticket status; pending click protection, success refresh, safe failure and stale-version reload | PLANNED becomes IN_PROGRESS once; Requester/terminal writes unavailable | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| STYLE-01 | Style/browser/component | AC-10 | Focus, labels, text status, mobile card wrapping | No inaccessible controls | Actions component/browser checks and screenshots; proposed standalone style file absent | Partial: Actions keyboard/focus/three-width checks pass; dashboard checks pending |
| E2E-01 | E2E | AC-01–05 | Two staff, one Ticket, multiple Actions, revisions | End-to-end work | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass: two IT Staff plus Admin; final focused rerun |
| E2E-02 | E2E | AC-06 | Requester indication, staff resolution, close/reopen/cancel | Gate enforced | `e2e/lab-04/ticket-resolution.spec.ts` | Pending |
| E2E-03 | E2E | AC-07–08, AC-10 | Both dashboard roles, drill-down, three widths | Correct responsive views | `e2e/lab-04/dashboards.spec.ts` | Pending |
| E2E-04 | E2E | AC-04, AC-10 | Staff and Admin use Start; verify IN_PROGRESS, performer and STARTED revision; Requester reads without Start; terminal denial and competing-version conflict | Correct lifecycle and recoverable UI feedback | `e2e/lab-04/action-start.spec.ts` | Pass |
| E2E-05 | E2E | AC-04–05, AC-10 | Lose committed or validation-rejected create response, edit draft, recover original body/key; edit recovered ID or release rejected draft for fresh creation | Committed replay: one Action with CREATED/EDITED; rejected retry: one Action with CREATED only, Save/Cancel usable | `e2e/lab-04/action-create-recovery.spec.ts` | Pass: both real-browser recovery paths |
| REG-01 | Regression | AC-11 | All Lab 1–3 Vitest, Playwright, build | Pass with isolated DB | Existing suites and `npm run build:*` | Partial: 39 files / 424 Vitest tests, both builds and five Actions browser checks passed; full legacy browser/release run pending |
| PERF-01 | Smoke | AC-08 | Seed-scale dashboard and indexed query plan | No unbounded Ticket payload/query | `server/tests/lab-04/dashboard-smoke.integration.test.ts` | Pending |

Every AC appears in the matrix. Final statuses and test commands will be updated only after execution. Manual visual review at 1440×900, 834×1112, and 390×844 records dashboard and Action screenshots plus keyboard/focus findings; it supplements, rather than replaces, the automated checks.

## INT-02 isolated migration recovery scenario

1. Create two distinct randomly named test databases in the guarded test-only PostgreSQL instance: a Lab 3 source and a clean recovery target, both using the same fixture schema name so backup restore needs no schema renaming. Create dedicated temporary attachment directories. Validate both URLs with the test-target guard; exclude development/production targets. Record the exact targets in test evidence without credentials.
2. Populate a representative Lab 3 fixture with active/inactive users, owned/unowned Tickets in several statuses, attachment metadata, public comments, internal notes and creation-request relationships. Snapshot complete fixture records, IDs, timestamps, versions, relation keys, row counts and attachment file SHA-256 values.
3. Make a pre-migration PostgreSQL backup using the selected `pg_dump`/restore format and a separate copy of attachment files. Record commands, backup integrity, tool versions and retained schema mappings. Keep credentials outside committed files/logs.
4. Apply the Lab 4 migration on the disposable source and trigger a controlled failure during migration validation to exercise the documented recovery decision. Stop further writes. The failure is deliberate and confined to the isolated source; it must not be treated as a successful migration.
5. Restore the pre-migration backup into the separate guarded clean recovery target using the documented `pg_restore` or SQL restore command. Restore attachment files into its dedicated directory. Do not reset or restore over the development database or its attachment directory.
6. Compare restored fixture records and relation keys to the baseline, run FK/orphan checks, and verify every retained attachment path, byte length and SHA-256. Confirm that pre-Lab-4 schema/data are restored and that no partial Action records remain. Verify the attachment download bytes using the restored metadata/storage mapping.
7. Report the controlled failure, recovery command, comparisons and checksums. Clean up only the randomly named targets/directories created by this test after validating their identities and paths. Set INT-02 to Pass only after the complete recovery scenario succeeds. Issue #40 executed this scenario; [data-foundation.md](data-foundation.md) records the observed result and reproduction requirements.
