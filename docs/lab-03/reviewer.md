# Lab 3 Peer Review Record

Status: Changes requested by Datakung on 2026-09-12 in [PR #31](https://github.com/auto4496/toktickit/pull/31). Workflow corrections are recorded below; approval and merge remain pending.

Baseline: completed Lab 2 main f124c72. Flow: feature branches -> lab3-staging -> main. The existing local Lab 2 report edits are outside this worktree and this PR.

## Participants

Author account: auto4496 (Phanuwit Butchari, student ID 67070501070). Lab 3 peer reviewer: Datakung (Pitchai Chadchuangchot, 67070501068), verified by the actual review submitted on 2026-09-12.

## Engineering contract review handoff

- Scope: specification.md, api-spec.md, ui-spec.md, tests.md, issue-plan.md, reviewer.md, ai-use.md.
- Branch: codex/lab3-1-engineering-contract; target lab3-staging.
- GitHub Issue: [#25](https://github.com/auto4496/toktickit/issues/25). Pull Request: [#31](https://github.com/auto4496/toktickit/pull/31), OPEN against lab3-staging.
- Formal Development link: created through GitHub addCloseIssueReferences and verified in PR closingIssuesReferences. At review time the live board had #25 Specified and #26 Started, contrary to the earlier record. Correction workflow: #25 moves to Fixing while corrections are prepared, then PR Review after the correction is pushed and answered; #26 returns to Backlog. #27-#30 remain Backlog.
- Initial contract commit: b006797c3fb185a36f84992bb99cfd453bc90e60; subsequent documentation-only handoff commit records the actual PR link. Review the current PR head, not an assumed unchanged SHA.
- Reviewed commit: 923648db0817724e115db4ff456ebb728bfb3e43. Reviewer: Datakung. Outcome: Changes requested at 2026-09-12 06:32:12 UTC (13:32:12 Asia/Bangkok).
- Author checks on 2026-09-08: 18 unique FRs, 30 unique BRs, 24 unique ACs; all 24 ACs reference planned tests; seven documents and their internal file links validated. Staged git diff --check passed. Cross-check against existing code corrected the inherited attachment-removal body to `reason`, retained the bare attachment-metadata response and preserved Requester sort metadata. No runtime feature claims.
- Key decisions: narrow Admin ticket access, assignment eligibility, transition matrix, terminal conversations vs inherited attachments, password/session/CSRF policy, initial-password migration and concurrency safety.
- UI direction: user specifically requested attractive UI consistent with the assignment; check queue density, responsive cards, hierarchy, and private/public separation against ui-spec.md.

## Review checklist

- [ ] Contract predates implementation; FR/BR/AC IDs and planned tests cover the complete handout scope.
- [ ] API routes/shapes/statuses and role/state rules agree with specification and UI.
- [ ] Migration preserves existing identity/attachments/idempotency and handles initialization safely.
- [ ] Authentication/CSRF/role/ownership/concurrency rules are explicit and testable.
- [ ] Zen Green components and desktop/tablet/mobile states meet the requested quality.
- [ ] Excluded screenshot features were not accidentally added.
- [ ] PR diff contains only the linked Issue work; GitHub Development link is present.
- [ ] Real findings have correction commits and individual responses; approvals/merges recorded only after they occur.

## Findings and responses

### 2026-09-12: Project status and evidence mismatch

- [Review finding](https://github.com/auto4496/toktickit/pull/31#discussion_r3995408941): the formal Issue link exists, but #25 was Specified and #26 Started. Return #25 to PR Review and #26 to Backlog until the contract is approved and merged; align the records with the live board.
- Correction: return #26 to Backlog, use Fixing for #25 during correction and PR Review for re-review, and correct the outdated no-review claims and board history in the documentation.
- Existing #26 authentication helpers and tests remain uncommitted local drafts in the separate lab3-foundation worktree. They are not included in this contract PR or treated as a completed/approved implementation increment. Further #26 work waits for contract approval and merge.
- Reviewer verification: documentation-only scope; git diff --check, internal Markdown links and FR/AC traceability checked. No runtime tests expected for this PR.
- Author correction verification: review the documentation diff, internal links and ID/test coverage; verify actual Project statuses after updating the board. The correction commit and reply are visible in this PR's history and linked review thread.
- Follow-up approval and merge: pending the peer's actual decision. Resolving an addressed comment does not dismiss the Changes requested review or constitute approval.

## Contract integration and foundation handoff

The historical pending note above was superseded by Datakung's actual approval and merge of PR #31 on 2026-09-13 at 04:47:19 UTC. Merge commit: `ec5deceea1e00fa2ddb60572fa741f284eb89796`. Issue #25 is closed. Issue #26 implementation was explicitly authorized by “เริ่มทำต่อเลย” and started from that staging commit in its separate foundation worktree.

Foundation review should inspect session/CSRF enforcement, the non-verifiable password sentinel refinement documented in foundation.md, preservation of legacy relations, safe repeat seed, real Requester regression coverage and screenshots. Staff/Admin operational features remain outside this PR. No independent review, approval or merge of #26 is claimed until the peer actually performs it.

Handoff: [PR #32](https://github.com/auto4496/toktickit/pull/32), implementation commit `3c427117f18d705f79107e9c0e92a9f4cbd90ca1`, targets `lab3-staging`. Issue #26 is in PR Review. The PR body references #26; formal Development-panel linking remains pending because the available browser is signed out of GitHub. This distinction is recorded explicitly rather than treating a body mention as a formal link. Peer review and merge remain pending.
