# Lab 4 Review Record

Status: contract #39, data foundation #41, Actions #43 and workflow #45 are independently approved and merged into `codex/lab4-staging`. Datakung approved workflow head `a1d1fce` on 2026-10-09 at 15:46:46 Asia/Bangkok and merged at 15:46:56 (`69b32d6`), confirming 458 tests, 14 relevant browser cases and both builds. Issue #46 dashboard independent review remains pending.

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
| Ticket workflow | Datakung | [#45](https://github.com/auto4496/toktickit/pull/45) | Independently confirmed 458 tests, 14 browser cases and both builds; no blocking findings | Approved `a1d1fce`; merged `69b32d6` |
| Dashboards and UI | Datakung (designated reviewer) | [#47](https://github.com/auto4496/toktickit/pull/47) | Issue #46; 483 tests, 26 browser cases, both builds and nine dashboard screenshots; author evidence in [dashboards.md](dashboards.md) | Pending |
| Final regression | Pending | Pending | Pending | Pending |
