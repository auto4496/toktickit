# Lab 4 Review Record

Status: Datakung requested changes on PR #39 on 2026-10-05 at 13:42:52 Asia/Bangkok (reviewed commit `1c7a0d8`). The corrections below are prepared for re-review. Independent approval remains pending.

Engineering contract issue: [#38](https://github.com/auto4496/toktickit/issues/38). Local document checks and author review do not count as independent peer approval.

## Author document check — 2026-10-04

Verified relative links across seven documents, AC-01 through AC-11 test-plan coverage and whitespace. Clarified canonical nonterminal dashboard filters and follow-up Action-assignee drill-down, including why Action count may exceed matching Ticket count. Planned test filenames are labelled explicitly. Independent review was subsequently submitted by Datakung as recorded below; approval remains pending.

## Peer findings and corrections — 2026-10-05

| Finding | Correction | Verification/status |
|---|---|---|
| [Recovery coverage](https://github.com/auto4496/toktickit/pull/39#discussion_r4181341740): successful migration and seed checks omit the required recovery test | Added INT-02 with a pre-migration backup, attachment copy, controlled isolated failure, restore to a clean test database, record/FK comparisons and file/download checksums; linked recovery plan from the specification | Plan added; execution remains Pending in this contract PR |
| [Start control](https://github.com/auto4496/toktickit/pull/39#discussion_r4181341744): PLANNED → IN_PROGRESS lacks an explicit UI contract | Added Start/Starting controls, role/Action/Ticket restrictions, expectedVersion, performer/STARTED revision, pending protection, success refresh and failure/conflict recovery; added UI-05/E2E-04 coverage | Contract added; execution remains Pending |
| Formal Development linkage missing | Linked PR #39 to Issue #38 through GitHub's closing-reference API | Confirmed Issue #38 in PR `closingIssuesReferences` |
| Project status was Backlog | Moved Issue #38 to PR Review after formal Development linking | Confirmed Project status PR Review on 2026-10-05 |

| Area | Reviewer | PR | Comment/response | Approval |
|---|---|---|---|---|
| Engineering contract | Datakung | [#39](https://github.com/auto4496/toktickit/pull/39) | Changes requested; findings and corrections above | Re-review/approval pending |
| Migration and Actions | Pending | Pending | Pending | Pending |
| Ticket workflow | Pending | Pending | Pending | Pending |
| Dashboards and UI | Pending | Pending | Pending | Pending |
| Final regression | Pending | Pending | Pending | Pending |
