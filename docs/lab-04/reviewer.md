# Lab 4 Review Record

Status: contract #39, data foundation #41 and Actions #43 are independently approved and merged into `codex/lab4-staging`. Datakung approved Actions head `935bcdf` on 2026-10-07 at 14:20:46 Asia/Bangkok and merged at 14:21:02 (`68a88cc`), independently passing 431 tests, seven browser tests and both builds after recovery corrections. Issue #44 Ticket workflow is under implementation; independent approval remains pending.

Engineering contract issue: [#38](https://github.com/auto4496/toktickit/issues/38). Local document checks and author review do not count as independent peer approval.

## Author document check — 2026-10-04

Verified relative links across seven documents, AC-01 through AC-11 test-plan coverage and whitespace. Clarified canonical nonterminal dashboard filters and follow-up Action-assignee drill-down, including why Action count may exceed matching Ticket count. Planned test filenames are labelled explicitly. Datakung subsequently requested changes and approved the corrected contract as recorded below.

## Peer findings and corrections — 2026-10-05

| Finding | Correction | Verification/status |
|---|---|---|
| [Recovery coverage](https://github.com/auto4496/toktickit/pull/39#discussion_r4181341740): successful migration and seed checks omit the required recovery test | Added INT-02 with a pre-migration backup, attachment copy, controlled isolated failure, restore to a clean test database, record/FK comparisons and file/download checksums; linked recovery plan from the specification | Plan added; execution remains Pending in this contract PR |
| [Start control](https://github.com/auto4496/toktickit/pull/39#discussion_r4181341744): PLANNED → IN_PROGRESS lacks an explicit UI contract | Added Start/Starting controls, role/Action/Ticket restrictions, expectedVersion, performer/STARTED revision, pending protection, success refresh and failure/conflict recovery; added UI-05/E2E-04 coverage | Contract added; execution remains Pending |
| Formal Development linkage missing | Linked PR #39 to Issue #38 through GitHub's closing-reference API | Confirmed Issue #38 in PR `closingIssuesReferences` |
| Project status was Backlog | Moved Issue #38 to PR Review after formal Development linking | Confirmed Project status PR Review on 2026-10-05 |

| Area | Reviewer | PR | Comment/response | Approval |
|---|---|---|---|---|
| Engineering contract | Datakung | [#39](https://github.com/auto4496/toktickit/pull/39) | Changes requested, four corrections, author reply and re-review; no remaining blocking findings | Approved `4886585`; merged by Datakung |
| Data foundation / recovery | Datakung | [#41](https://github.com/auto4496/toktickit/pull/41) | Reported independently passing 391 tests and both builds; no blocking findings | Approved `301c902`; merged |
| Actions API/UI | Datakung | [#43](https://github.com/auto4496/toktickit/pull/43) | Independently passed 431 tests, seven browser journeys and both builds at `935bcdf`; all findings corrected | Approved `935bcdf`; merged `68a88cc` |
| Ticket workflow | Pending | Pending | Issue #44; author checks in [workflow.md](workflow.md) | Pending |
| Dashboards and UI | Pending | Pending | Pending | Pending |
| Final regression | Pending | Pending | Pending | Pending |
