# Lab 4 Test Plan and Traceability

Status: planned before implementation. `Pending` means no passing result has been observed. Use only isolated `TEST_DATABASE_URL` and the Lab 3 guard; never run destructive test setup against the development database.

| ID | Type | AC | Check | Expected | Automated file | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-03 | Normalize Action text, follow-up and completion fields | Invalid/over-limit rejected | `server/tests/lab-04/actions-validation.unit.test.ts` | Pending |
| UNIT-02 | Unit | AC-06 | Every status edge and Action gate decision | Exact matrix/gate | `server/tests/lab-04/ticket-workflow.unit.test.ts` | Pending |
| API-01 | API | AC-01, AC-03 | Create Action, actor/assignee, validation and inactive assignee | Correct data/400 | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-02 | API | AC-02 | Own/non-owned Requester reads and write denial | Own only/403/404 | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-03 | API | AC-04 | Edit, transition, revisions, stable list order, terminal lock | Ordered history/409 | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-04 | API | AC-04, AC-05 | Concurrent stale edit and repeated create key | One winner/one row | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-05 | API | AC-06 | Status matrix, owner/confirmation/version and resolution gate via raw request | Only legal transitions | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-06 | API | AC-07 | Requester counts/window/order/other-user isolation | Database-matching owned data | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pending |
| API-07 | API | AC-08 | Staff/Admin metrics, role denial, deterministic recent list | Exact counts/order/403 | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pending |
| INT-01 | Integration | AC-09 | Migrate Lab 3 fixture and compare counts/FKs; seed twice | No loss/overwrite | `server/tests/lab-04/migration.integration.test.ts` | Pending |
| UI-01 | Component | AC-10 | Staff dashboard cards, links, loading/zero/error | Accessible states | `client/tests/lab-04/StaffDashboard.test.tsx` | Pending |
| UI-02 | Component | AC-10 | Requester dashboard ownership display, links, error | Accessible states | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pending |
| UI-03 | Component | AC-01–04, AC-10 | Action read/edit/create, validation, conflict, role visibility | Safe UI states | `client/tests/lab-04/ActionsTaken.test.tsx` | Pending |
| UI-04 | Component | AC-06, AC-10 | Status gate error and refresh | Correct feedback | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pending |
| STYLE-01 | Style | AC-10 | Focus, labels, text status, mobile card wrapping | No inaccessible controls | `client/tests/lab-04/ResponsiveStyles.test.tsx` | Pending |
| E2E-01 | E2E | AC-01–05 | Two staff, one Ticket, multiple Actions, revisions | End-to-end work | `e2e/lab-04/actions-taken-flow.spec.ts` | Pending |
| E2E-02 | E2E | AC-06 | Requester indication, staff resolution, close/reopen/cancel | Gate enforced | `e2e/lab-04/ticket-resolution.spec.ts` | Pending |
| E2E-03 | E2E | AC-07–08, AC-10 | Both dashboard roles, drill-down, three widths | Correct responsive views | `e2e/lab-04/dashboards.spec.ts` | Pending |
| REG-01 | Regression | AC-11 | All Lab 1–3 Vitest, Playwright, build | Pass with isolated DB | Existing suites and `npm run build:*` | Pending |
| PERF-01 | Smoke | AC-08 | Seed-scale dashboard and indexed query plan | No unbounded Ticket payload/query | `server/tests/lab-04/dashboard-smoke.integration.test.ts` | Pending |

Every AC appears in the matrix. Final statuses and test commands will be updated only after execution. Manual visual review at 1440×900, 834×1112, and 390×844 records dashboard and Action screenshots plus keyboard/focus findings; it supplements, rather than replaces, the automated checks.
