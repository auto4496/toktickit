# Lab 2 Peer Review Record

Status: Engineering Contract corrections submitted; follow-up review requested

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
| Engineering Contract | `feature/lab2-1-engineering-contract` | Specification, API, UI, test traceability, initial review/AI records | [#11](https://github.com/auto4496/toktickit/issues/11) | [#12](https://github.com/auto4496/toktickit/pull/12) | Changes requested at `fbd0f83`; corrected in `643ad65`; re-review requested |
| Data and Requester Context | `feature/lab2-2-data-requester-context` | Prisma migration, idempotent seed, reference APIs, selector/context, tests | TBD | TBD | Planned |
| Create Ticket | `feature/lab2-3-create-ticket` | Ticket API/UI, validation, idempotency, failure preservation, tests | TBD | TBD | Planned |
| My Tickets | `feature/lab2-4-my-tickets` | Ownership, search, filters, sort, pagination, states, tests | TBD | TBD | Planned |
| Ticket Detail and Attachments | `feature/lab2-5-ticket-detail-attachments` | Detail ownership, upload/download/soft removal, compensation, tests | TBD | TBD | Planned |
| Quality and Release Evidence | `feature/lab2-6-quality-evidence` | Responsive/E2E/visual evidence, README, final test records | TBD | TBD | Planned |
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
- Approval: Pending re-review after every comment is answered and resolved.
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
