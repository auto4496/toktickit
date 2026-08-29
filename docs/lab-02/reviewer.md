# Lab 2 Peer Review Record

Status: Living document; update after every Lab 2 review

Workflow: feature branch -> peer-reviewed Pull Request -> `lab2-staging` -> release Pull Request -> `main`

## Participants

| Role | Name | Student ID | GitHub |
|---|---|---|---|
| Author | Phanuwit Butchari | 67070501070 | [@auto4496](https://github.com/auto4496) |
| Peer reviewer | To be confirmed before the first implementation PR | - | - |

The reviewer must perform a real review against the Issue scope, contract, tests, and changed files. Approval is recorded only after blocking findings are resolved. A reviewer does not need to invent a problem when the implementation satisfies the contract; a clear no-blocker review with checked evidence is acceptable.

## Planned Pull Requests

GitHub assigns Issue and PR numbers when they are created. Existing Lab 1 Issue numbers are not reused.

| Lab 2 work item | Planned branch | Contract and evidence focus | Issue | Pull Request | Review outcome |
|---|---|---|---|---|---|
| Engineering Contract | `feature/lab2-1-engineering-contract` | Specification, API, UI, test traceability, initial review/AI records | TBD | TBD | In progress |
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
- [ ] Review comments receive a response and blocking findings are corrected before approval.

## Pull Requests Authored by Me

Add one subsection per PR using this format:

### `<Issue title>`

- Issue: TBD
- Pull Request: TBD
- Branch: TBD
- Reviewed commit: TBD
- Requirements/ACs/Tests: TBD
- Review feedback received: TBD
- My response and correction: TBD
- Verification after correction: TBD
- Approval: TBD
- Merge commit: TBD

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
