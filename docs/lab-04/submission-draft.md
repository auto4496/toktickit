# LAB4 Submission - Review Draft

Prepared for Phanuwit Butchari (67070501070), GitHub auto4496. Independent peer: Pitchai Chadchuangchot (67070501068), GitHub Datakung, as recorded in the prior submission/review history. The repository and actual final main remain authoritative. This draft uses fresh evidence from reviewed main merge 7a697d2. Final student review/demonstration/native zoom and all-Issues-Done closeout remain pending.

## Answer Part 1 - Git Use with Engineering Workflow

Repository: [auto4496/toktickit](https://github.com/auto4496/toktickit). [Project](https://github.com/users/auto4496/projects/1). Six work items are mapped in [issue-plan.md](issue-plan.md). Five feature Issues are closed/Done with independent approvals/merges recorded in [reviewer.md](reviewer.md). The engineering contract #39 predates the feature PRs. The final hardening branch targets `codex/lab4-staging`, followed by a separately reviewed release to main; both integrations are now independently approved and merged; see main-verification.md. Include current README, .gitignore, directory tree and Git graph, then refresh the graph/Project after main acceptance.

## Answer Part 2 - Spec DD

Render and link [specification.md](specification.md). It numbers FR-01 to FR-09, BR-01 to BR-18 and AC-01 to AC-11, defines roles, Action fields/statuses, Ticket transitions, exact UTC dashboard windows and data-preserving migration/recovery. Version locks and immutable revision storage are justified design decisions. Contract PR #39 was independently approved before foundation #41 and implementation #43/#45/#47.

## Answer Part 3 - Test DD and Traceability

Render [tests.md](tests.md); actual execution is in [final-verification.md](final-verification.md). Include complete unit/API/integration/component and browser outputs, production builds, recovery and natural query-plan evidence. Fresh complete main results and clean-source provenance are in [main-verification.md](main-verification.md).

## Answer Part 4 - AI Use with Reflection

Render [ai-use.md](ai-use.md), containing eight edited technical prompt summaries, verified gpt-6-sol / gpt-6.1-sol IDs, specification/coding-agent roles and a project-based Thai Reflection. Summaries are explicitly distinguished from verbatim chat messages; no student-performed testing is invented.

## Answer Part 5 - Working IT Staff Dashboard UI

Show Staff/Admin desktop/tablet/mobile cards, status/priority counts and five recent Tickets. API checks compare every metric with authoritative queries; the scale fixture has 5,000 Tickets and 10,000 Actions. Current-user unfinished follow-up Action count may exceed the distinct Ticket drill-down count. Real browser cases verify matching filters, role navigation and safe loading/empty/forbidden/retry feedback. Simulated responses are labelled in their capture names.

## Answer Part 6 - Working Actions Taken UI

Show multiple Actions by two Staff and Admin on one Ticket; create/edit/validation, Start, Result completion, cancel, stale-version conflict and read-only Requester views. API tests cover inactive-assignee rejection, authorization, deterministic order, atomic revisions and repeated keys. Real-browser response-loss tests prove both committed-create recovery and release of definitively rejected attempts without duplication or lost drafts. Include complete three-width captures and links to full-size evidence.

## Answer Part 7 - Working Ticket Workflow

Show blocked/ready resolution, a real competing unfinished Action rejection, closed state and preserved history on reopening. Only Staff may change Ticket status, even though Admin may mutate Actions. Requester indication remains advisory. All 64 Ticket status edges and concurrent transaction ordering are tested; immutable Action history and stable ordering are retained.

## Answer Part 8 - Working Requester Dashboard and Final Regression UI

Show owned open/waiting/recent metrics, real list/detail drill-down and ownership denial. Full browser regression includes authentication/password change/logout, My Tickets, attachment download/removal, public comments, Staff operations, private notes and Admin create/edit/reset/dirty-navigation behavior. Final-main output remains a release gate.

## Answer Part 9 - Zen Green UI, Responsive, Accessibility and Final Polish

Render [ui-spec.md](ui-spec.md) and [completed author checklist](visual-accessibility.md). Include desktop 1440x900, tablet 834x1112, mobile 390x844 and 320px overflow evidence. Check focus, semantic labels, status text, validation placement, editable/read-only distinction and private/shared separation. Representative visual inspection complements automated geometry, dialog and keyboard checks; it does not claim complete accessibility certification.
