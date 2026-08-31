# Lab 2 Peer Review Record

Status: Data and Requester Context second correction submitted; follow-up review requested

Workflow: feature branch -> peer-reviewed Pull Request -> `lab2-staging` -> release Pull Request -> `main`

## Participants

| Role | Name | Student ID | GitHub |
|---|---|---|---|
| Author | Phanuwit Butchari | 67070501070 | [@auto4496](https://github.com/auto4496) |
| Peer reviewer | Pitchai Chadchuangchot | 67070501068 | [@Datakung](https://github.com/Datakung) |

The reviewer must perform a real review against the Issue scope, contract, tests, and changed files. Approval is recorded only after blocking findings are resolved. A reviewer does not need to invent a problem when the implementation satisfies the contract; a clear no-blocker review with checked evidence is acceptable.

## Planned Pull Requests

GitHub assigns Issue and PR numbers when they are created. Existing Lab 1 Issue numbers are not reused.

| Lab 2 work item | Planned branch | Contract and evidence focus | Issue | Pull Request | Review outcome |
|---|---|---|---|---|---|
| Engineering Contract | `feature/lab2-1-engineering-contract` | Specification, API, UI, test traceability, initial review/AI records | [#11](https://github.com/auto4496/toktickit/issues/11) | [#12](https://github.com/auto4496/toktickit/pull/12) | Approved at `522392e`; merged by the reviewer as `2bcdb54` |
| Data and Requester Context | `feature/lab2-2-data-requester-context` | Prisma migration, idempotent seed, reference APIs, selector/context, tests | [#13](https://github.com/auto4496/toktickit/issues/13) | [#18](https://github.com/auto4496/toktickit/pull/18) | Changes requested at `f4f86e1` and `057b71c`; corrected in `1157ed2` and `c19d2f8`; re-review requested |
| Create Ticket | `feature/lab2-3-create-ticket` | Ticket API/UI, validation, idempotency, failure preservation, tests | [#14](https://github.com/auto4496/toktickit/issues/14) | TBD | Planned |
| My Tickets | `feature/lab2-4-my-tickets` | Ownership, search, filters, sort, pagination, states, tests | [#15](https://github.com/auto4496/toktickit/issues/15) | TBD | Planned |
| Ticket Detail and Attachments | `feature/lab2-5-ticket-detail-attachments` | Detail ownership, upload/download/soft removal, compensation, tests | [#16](https://github.com/auto4496/toktickit/issues/16) | TBD | Planned |
| Quality and Release Evidence | `feature/lab2-6-quality-evidence` | Responsive/E2E/visual evidence, README, final test records | [#17](https://github.com/auto4496/toktickit/issues/17) | TBD | Planned |
| Lab 2 release | `lab2-staging` -> `main` | Integrated final contract, passing tests/builds, complete evidence | N/A | TBD | Planned |

## Review Checklist

Each review records the commit reviewed and checks:

- [ ] The branch and diff are limited to the linked Issue scope.
- [ ] Relevant FR, BR, AC, and planned Test IDs are identified.
- [ ] New behavior is covered by failing-then-passing tests or a documented test-first record.
- [ ] Tests and builds pass from the documented commands, or an environment limitation is explicitly reproduced and recorded.
- [ ] API responses, status codes, validation, ownership, and safe errors match the approved contract.
- [ ] Database schema, migration, seed, indexes, and generated changes are reviewed when applicable.
- [ ] UI states, responsive behavior, accessibility, and Zen Green rules are reviewed when applicable.
- [ ] No secrets, local uploads, generated build output, unrelated files, or unreviewed dependencies are included.
- [ ] The PR is linked to its Issue through GitHub's Development panel, not only by a branch association or body mention.
- [ ] The Issue is in Fixing while requested changes are being addressed and returns to PR Review only after corrections are pushed and discussed.
- [ ] Every review comment receives an author reply after its correction is pushed; an addressed thread is resolved only after that reply.
- [ ] Blocking findings are corrected and verified before approval.
- [ ] After approval, the approving peer reviewer—not the PR author—merges the PR into `lab2-staging`.

## Pull Requests Authored by Me

### Lab 2 Engineering Contract and Test Plan

- Issue: [#11](https://github.com/auto4496/toktickit/issues/11)
- Pull Request: [#12](https://github.com/auto4496/toktickit/pull/12)
- Branch: `feature/lab2-1-engineering-contract`
- Reviewed commit: `fbd0f83`
- Requirements/ACs/Tests: FR-01-FR-32, BR-01-BR-43, AC-01-AC-25, and the complete planned test matrix in `tests.md`
- Reviewer: Pitchai Chadchuangchot ([@Datakung](https://github.com/Datakung))
- Review outcome: Changes requested
- Review feedback received: define deterministic idempotency and concurrency; specify priority ordering; make filename sanitization and content verification exact; serialize the five-active-file limit and cleanup; remove or define preview; expand AC-24 failure coverage; replace reviewer placeholders with actual evidence; and make Development-panel, response/resolution, status, and reviewer-merge workflow explicit.
- My response and correction: the contract now defines canonical request hashing and atomic replay behavior, explicit business priority rank, extension/MIME/magic-byte and basename rules, per-Ticket upload serialization and compensation, a no-preview decision, expanded safe-error tests, this actual review record, and the required GitHub workflow.
- Correction commit: `643ad65`
- Reviewer's initial verification: server and client builds passed; five non-database tests passed; the Category API test could not run because `DATABASE_URL`/PostgreSQL was unavailable in the review environment.
- Verification after correction: On 2026-08-30, `npm run build:server` and `npm run build:client` passed. `npm test` passed five non-database tests; the Category API test remained environment-blocked because PostgreSQL was unavailable at `localhost:5432`.
- GitHub workflow response: PR #12 was linked to Issue #11 through the Development panel. Issue #11 moved to Fixing while corrections were handled, all eight review threads received a response before being resolved, the Issue returned to PR Review, and a follow-up review was requested from `@Datakung` on 2026-08-30.
- Follow-up review at `7dda4e7`: Changes requested. The eight original findings and workflow corrections were accepted; the reviewer requested two final clarifications—the initial Submit enabled/disabled rule and the user-visible `ATTACHMENT_FILE_UNAVAILABLE` state.
- Final correction: Commit `e0213ea` defines Submit as disabled during reference loading and enabled afterward so invalid submission displays client validation without an API request. It also defines the unavailable Attachment badge/message and retains Retry Download and Remove; AC-05, AC-17, UI-03, and UI-10 are aligned.
- Final correction workflow: Issue #11 moved from PR Review to Fixing, `e0213ea` was pushed, both follow-up threads received replies and were resolved, and the Issue returned to PR Review on 2026-08-30.
- Approval: Approved by `@Datakung` at `522392e` on 2026-08-31 (2026-08-30 UTC).
- Merge: Merged by the peer reviewer into `lab2-staging` as `2bcdb54` on 2026-08-31 (2026-08-30 UTC).

### Data Foundation and Development Requester Context

- Issue: [#13](https://github.com/auto4496/toktickit/issues/13)
- Pull Request: [#18](https://github.com/auto4496/toktickit/pull/18)
- Branch: `feature/lab2-2-data-requester-context`
- Implementation commit: `18d74f1`; review handoff evidence commit: `00573c0`
- Requirements/ACs/Tests: FR-01-FR-07, FR-32; BR-01-BR-07, BR-39-BR-43; AC-01-AC-03, AC-24, AC-25; API-01, API-02, and UI-01
- Reviewed commit: `f4f86e1`
- Review outcome: Changes requested by `@Datakung`.
- Review feedback received: add BR-40 operational logging tied to the returned correlation ID; align the mobile breakpoint with `<768px`; enforce 44 by 44 pixel targets for Change Requester and Retry; add real PostgreSQL seed/filter/order coverage and an unsorted Related System fixture; cover unknown and failed Requester lookups; prove persisted `localStorage` restoration; and align the living workflow record with GitHub and the completed PR #12 outcome.
- My response and correction: unexpected errors now log their correlation ID, code, operation, and original error while responses remain safe; mobile behavior begins at 767px and the named controls have 44px minimum dimensions; a reusable seed function supports isolated PostgreSQL integration tests; requester-context, sorting, persistence, and foundation-style coverage were expanded; and the review record now includes the actual PR #12 approval and merge.
- Correction commit: `1157ed2`
- Verification after correction: the idempotent seed passed twice with 4 Categories, 6 Related Systems, and 5 Requesters; server and client production builds passed; all 9 test files and 28 tests passed, including real PostgreSQL active/inactive filtering and ordering.
- GitHub workflow response: PR #18 targets `lab2-staging` and is linked to Issue #13 through the Development panel. Issue #13 moved to Fixing while corrections were handled; all seven review threads received a response before being resolved; the PR summary was corrected from `sessionStorage` to `localStorage`; the Issue returned to PR Review; and a follow-up review was requested from `@Datakung` on 2026-08-31.
- Follow-up review at `057b71c`: Changes requested. The seven original findings were accepted; the reviewer identified that the new PostgreSQL integration test still inherited the normal `DATABASE_URL`, so `npm test` could seed or modify development data. The reviewer required a dedicated `TEST_DATABASE_URL`, a clear test-only guard, Vitest configuration, and an isolated command in the documentation.
- Second correction: Commit `c19d2f8` adds a test-database URL guard that requires a distinct `test` database/schema marker, rejects development/production/live markers and the same database/schema as `DATABASE_URL`, and injects the accepted URL as Prisma's `DATABASE_URL` only inside Vitest. It adds `.env.test.example`, an isolated `npm run test:integration` command, guard coverage, and independent Lab 1 category seeding against the guarded test database.
- Verification after second correction: missing `TEST_DATABASE_URL` failed during Vitest configuration before test collection or database access; `npm run test:integration` passed 1 file and 3 PostgreSQL tests against `toktickit_test`; `npm test` passed 10 files and 34 tests against the same isolated database; server and client production builds passed.
- Second correction workflow: Issue #13 moved from PR Review to Fixing while the correction was implemented. Commit `c19d2f8` and this evidence were pushed before the Issue returned to PR Review and another review was requested from `@Datakung` on 2026-08-31.
- Approval: Pending second follow-up review from `@Datakung`.
- Merge: Pending; the approving peer reviewer must merge into `lab2-staging`.

## Pull Requests I Reviewed for My Partner

Record at least the partner repository, Issue/PR link, commit reviewed, evidence checked, feedback given, partner response, follow-up verification, and final approval outcome. Do not claim a command was rerun when only code inspection was possible.

## Final Integration

Before the Lab 2 release PR is approved, record:

- Final `lab2-staging` commit: TBD
- Complete test result: TBD
- Server build: TBD
- Client build: TBD
- Migration and two-run seed verification: TBD
- Desktop/tablet/mobile visual review: TBD
- Release PR and approval: TBD
- Final `main` merge commit: TBD
