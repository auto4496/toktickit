# Lab 3 Peer Review Record

Status (2026-09-26): PRs #31–35 are approved and merged into staging. Work items #25–29 are complete. Issue #30 remains Backlog; final-main verification and submission are not yet complete. Earlier pending statements below are historical.

## System verification integration — 2026-09-26

Datakung approved PR #35 commit `3d251ce2ecdf074bb18792f0b7aae85a0589645a` at 2026-09-25 18:07:08 UTC (2026-09-26 01:07:08 Bangkok). The reviewer independently passed all 389 tests, all 17 browser journeys and both production builds, verified all 109 screenshot checksums, and reported no blocking findings. The peer merged at 18:07:29 UTC as `e685eec892d2b09fdeeeafcb8dc0c253ae6c4f31`.

[Actual review and merge](https://github.com/auto4496/toktickit/pull/35). No correction or additional approval is needed for #29. Final-main verification, final PDF, native browser zoom/final human inspection and the student's reading of the Reflection remain #30. This post-merge documentation closeout is prepared for inclusion in that reviewed release, without directly modifying staging or main.

## Administrator integration — verified 2026-09-25

Datakung approved correction `c84ad03e191a9ce8f81d2829dd50c0de4b9b6cf3` on 2026-09-22 at 14:30:11 UTC. Their re-review passed 85 client cases, the original independent reproduction, all 13 browser tests and both builds. The peer did not rerun the full API/unit suite for that frontend correction. PR #34 merged at 14:30:21 UTC as `2c6f79938ec17573e8727639c34e60eefbc190c5`.

The user authorized replies confirming both fixes; actual replies are [navigation correction](https://github.com/auto4496/toktickit/pull/34#discussion_r4072766062) and [specific success assertion](https://github.com/auto4496/toktickit/pull/34#discussion_r4072767621). Issue #28 was closed and moved to Done after the verified merge. This supersedes the earlier pending/reply-not-sent notes.

## System verification handoff — Issue #29 (historical, before approval)

Branch `codex/lab3-5-system-verification` starts at the PR #34 merge above. Scope: integrated regression, failure rollback, responsive/state captures, evidence mapping, README and the nine-part submission draft. [System verification](system-verification.md) records actual checks and limitations. Review capture provenance, real versus simulated evidence, retained migration/data checks and accessibility assertions. Only the approving peer may merge; no independent approval or final-main run is claimed.

Handoff: [PR #35](https://github.com/auto4496/toktickit/pull/35), target `lab3-staging`. Source/capture commit `08d3711`, completed jsdom fixture `5a0934e`, evidence/results commit `3d251ce`. Final author checks: 389 Vitest cases in 36 files, 17 browser journeys, both builds, 109 verified image checksums and local document links passed. Issue #29's formal Development link is verified through closingIssuesReferences. After linking, the board read Specified; it was corrected and read back as PR Review. Issue #30 remains Backlog. No separate reviewer message/request was sent, and no peer approval or merge is claimed.

## Administrator handoff — 2026-09-20

### Peer correction — 2026-09-21

Datakung requested changes on reviewed head `88922cb`: [dirty in-app navigation](https://github.com/auto4496/toktickit/pull/34#discussion_r4060222962) and [ambiguous success notices in browser assertions](https://github.com/auto4496/toktickit/pull/34#discussion_r4060222970). The reviewer independently passed all 378 tests and both builds; their full browser run had 11 passes and one timing-sensitive failure, followed by a passing targeted rerun. That targeted rerun is not recorded as a clean full-suite pass.

The correction connects the editor's dirty state to the App router, confirms shell navigation and native Back/Forward before unmounting, preserves the draft on Cancel, and bypasses the guard for logout/mandatory authentication changes. Both success assertions now filter by their intended notice text, without sleeps or arbitrary first matches. Five new App-level tests failed before the fix and pass afterward; a real browser Back/Forward journey was added. Current correction verification is recorded in tests.md. Peer re-approval remains pending; no review reply or re-review request has been sent on the user's behalf for this correction.

- Issue [#28](https://github.com/auto4496/toktickit/issues/28), [PR #34](https://github.com/auto4496/toktickit/pull/34), target lab3-staging.
- Implementation/evidence commit: 25776f3. The follow-up handoff commit changes documentation only; review the live PR head.
- Formal Development relationship is verified by the PR closingIssuesReferences API. Project status: PR Review.
- Author verification: 378 Vitest cases in 34 files, 12 browser journeys, both builds and diff check passed. Actual results, initial failures and screenshot inspection are in tests.md; implementation decisions are in user-management.md.
- Requested reviewer attention: shared account/ticket lock ordering, real concurrent last-admin and owner eligibility protection, reset/session revocation, and explicit conflict review without losing draft values.
- No independent review is claimed. No review request or message was sent on the user's behalf for this new PR. Await peer feedback and approval; do not self-merge.

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

### PR #33 conversation recovery correction — 2026-09-16

Datakung requested changes on `4196fc9` after independently passing all 344 tests, ten browser journeys and both builds. [The inline finding](https://github.com/auto4496/toktickit/pull/33#discussion_r4023073618) reproduces a saved 21st entry whose response is lost: reloading page 1 hid that entry on page 2 while enabling retry.

Correction: retain an uncertain-post recovery marker per ticket/conversation resource. Read pagination metadata, follow the current last page and display its entries before enabling a deliberate retry. Failed reads and tab switches do not clear the marker. Retain the relevant draft and never automatically replay POST. Three new regression cases cover public comments, internal notes, delayed last-page loading and failed recovery followed by a tab switch. All three failed on the reviewed implementation and pass after the correction. Client-suite/build verification is recorded in tests.md. This correction does not claim peer approval.

### Issue #27 author verification — 2026-09-16

The user requested “ทำ 3 ต่อเลย” and then “ทำต่อเลย”. Implementation is isolated on `codex/lab3-3-staff-workflow`, based on PR #32 merge `1bf45888cdf4691f198d2c3d9ca38b164b6516f0` (merged 2026-09-15 at 07:32:17 UTC). PR #32's two findings were corrected in `82d7019` before peer approval/merge. The live Project item for #27 was moved to Started.

Review this increment's queue query semantics, private-note exclusion, strict role matrix, operational version checks, terminal exceptions and shared account-lock ordering. Real concurrent API tests and complete status-edge coverage are in `staff-workflow.api.test.ts`; browser journeys include Admin's restricted ticket view and Requester indication. No new database migration or development-data reset is included. The upcoming user-administration increment must use the documented shared lock and add actual Admin endpoint races.

Author verification results and selected screenshot paths are recorded in tests.md and staff-workflow.md. These are author checks, not an independent peer review. No approval, resolved peer finding or reviewer merge of this increment is claimed in advance.

Handoff: [PR #33](https://github.com/auto4496/toktickit/pull/33), implementation/evidence commit `f8c1f4971211ad2f385cfd956990d021515d4a0e`, targets `lab3-staging`. Issue #27 was formally linked through Development and moved to PR Review; both were verified through GitHub's API on 2026-09-16. Full author verification: 344 Vitest cases, ten browser journeys and both builds passed. Independent peer review/approval/merge remain pending.

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

Handoff: [PR #32](https://github.com/auto4496/toktickit/pull/32), implementation commit `3c427117f18d705f79107e9c0e92a9f4cbd90ca1`, targets `lab3-staging`. Issue #26 is in PR Review and formally linked in Development, verified in the GitHub sidebar and closingIssuesReferences after the user signed in. Peer review and merge remain pending.

## PR #32 requested changes — 2026-09-15

Datakung reviewed `7f2a5dd` and requested changes for [stale CSRF recovery](https://github.com/auto4496/toktickit/pull/32#discussion_r4011398678) and [intended-route restoration](https://github.com/auto4496/toktickit/pull/32#discussion_r4011398684). The peer independently passed 51 client tests and both builds, reproduced the CSRF defect with an additional test, and explicitly did not rerun database/E2E checks.

Corrections: discard the rejected cached CSRF token so only a subsequent deliberate mutation attempt bootstraps a fresh token; do not retry the failed mutation automatically. Preserve an allowlisted internal destination through login and the initial-password gate (including reload), then validate against the authenticated role before returning there. Invalid/external/disallowed destinations use the role landing page. Successful logout clears the pending destination.

`ReviewRegressions.test.tsx` added nine cases. Before corrections, four cases failed (login/logout CSRF refresh and both destination-restoration cases); five rejected-destination cases passed. After correction, all 60 client tests across nine files passed, with both production builds passing. No database/E2E rerun is claimed for this frontend correction.

The live board was independently found at Specified despite the earlier handoff record. It was moved to Fixing during correction; the handoff returns it to PR Review and verifies the persisted value. Corrections do not dismiss the peer's Changes requested review; follow-up approval/merge remain pending.
