# Lab 3 Six-Issue Plan

Status: Agreed decomposition; actual GitHub links are recorded below after creation. Six work items include the release itself, reducing planned peer-review rounds without omitting tests.

| Work item | Title | Dependency | Scope / completion boundary | Branch / PR target |
|---|---|---|---|---|
| 1 | Sprint 3 Engineering Contract | Completed Lab 2 main | Reviewed specification, API/UI spec, AC-mapped test plan, issue plan and initial honest review/AI records. | codex/lab3-1-engineering-contract -> lab3-staging |
| 2 | Authentication and Requester Foundation | 1 | User/ticket migration and seed, secure authentication/initial-password/session/CSRF, backend authorization, role shell and authenticated Lab 2 regression including attachments. Feature tests pass. | codex/lab3-2-auth-requester -> lab3-staging |
| 3 | IT Staff Ticket Workflow | 2 | Queue/detail, claim/reassign/priority/status, public/private conversation, Requester resolution indication and narrow Admin lookup/priority rights. Feature tests pass. | codex/lab3-3-staff-workflow -> lab3-staging |
| 4 | Administrator User Management | 2; integrate with 3 for owner-safety end-to-end | Minimal users API/UI, password reset, one role, activity/last-admin/assigned-owner/concurrency rules. Feature tests pass. | codex/lab3-4-user-administration -> lab3-staging |
| 5 | System Verification and Visual Evidence | 2-4 | Integrated E2E/regression/accessibility/style/responsive checks, curated screenshots, README and submission-ready evidence draft. Recheck all six contract documents. | codex/lab3-5-system-verification -> lab3-staging |
| 6 | Release Integration and Submission | 1-5 | Review release diff; merge staging to main through peer review, run final-main checks, complete links/results and one PDF Answer Part 1-9. | lab3-staging -> main |

Work items 3 and 4 may proceed separately after foundation integration. Do not hide runtime work in contract or release PRs. Keep one coherent PR per work item; commits can separate data/API/UI/tests inside the larger foundation/workflow PRs for reviewer readability.

## GitHub and review workflow

Use the existing TokTickIT Individual Sprints Project and statuses Backlog, Specified, Started, PR Review, Fixing, Done. Start each branch from current integrated lab3-staging. Link the PR to its Issue through GitHub Development (a body mention alone is not evidence). Since feature PRs target staging rather than default main, close/set Done after actual reviewed merge rather than assuming a closing keyword already closed the Issue.

Record reviewed commit, findings, response/correction and actual approval in reviewer.md. The approving peer performs merges, following the Lab 2 convention. No approval or review request is fabricated. All six work items require their own tests/evidence updates as relevant, with E2E integration in item 5. Items are not Done just because code was pushed.

Prepare the report and evidence structure in item 5. Item 6's staging-to-main PR includes any release documentation corrections before peer approval, so six planned PRs remain sufficient. After merge, record final-main command output in the release Issue evidence and final PDF; if substantive fixes are needed, a corrective reviewed PR is justified and the six-PR estimate must be updated honestly. Never bypass review merely to preserve a numerical limit.

## Submission map

| PDF heading | Points | Evidence prepared across work items |
|---|---:|---|
| Answer Part 1 | 10 | Git graph/feature->staging->main, Project Done, reviewer identity/PRs/comments/responses/approvals, README/.gitignore/tree |
| Answer Part 2 | 5 | Rendered specification with FR/BR/roles/AC/migration/DoD and dated pre-implementation history |
| Answer Part 3 | 10 | Rendered tests.md, AC mapping, actual file paths, full final-main unit/API/UI/authorization/regression/E2E results |
| Answer Part 4 | 5 | Actual LLM, 6-10 real prompts, student reflection on specification/coding use |
| Answer Part 5 | 5 | Valid/invalid/inactive/busy/failure/first-change/login-role/logout/direct-access evidence |
| Answer Part 6 | 5 | Realistic queue/query/pagination/owner/badges/detail/empty/failure/responsive |
| Answer Part 7 | 10 | Ownership/priority/status/public/private/attachments/indication/validation/role + direct API evidence |
| Answer Part 8 | 5 | Minimal users search/create/edit/reset/role/activity/duplicate/self/last-admin/forbidden/responsive |
| Answer Part 9 | 5 | Rendered ui-spec, desktop/tablet/mobile scenes and completed human visual checklist |

## Live Issue links

Created on 2026-09-08 and added to the existing [TokTickIT Individual Sprints Project](https://github.com/users/auto4496/projects/1).

Work item 1 is in PR Review via formally linked [PR #31](https://github.com/auto4496/toktickit/pull/31); items 2-6 remain Backlog. No approval/merge has occurred.

| Work item | GitHub Issue |
|---|---|
| 1 | [#25 Sprint 3 Engineering Contract](https://github.com/auto4496/toktickit/issues/25) |
| 2 | [#26 Authentication and Requester Foundation](https://github.com/auto4496/toktickit/issues/26) |
| 3 | [#27 IT Staff Ticket Workflow](https://github.com/auto4496/toktickit/issues/27) |
| 4 | [#28 Administrator User Management](https://github.com/auto4496/toktickit/issues/28) |
| 5 | [#29 System Verification and Visual Evidence](https://github.com/auto4496/toktickit/issues/29) |
| 6 | [#30 Release Integration and Submission](https://github.com/auto4496/toktickit/issues/30) |
