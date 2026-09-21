# Lab 3 AI Use Record

Status: Living record with six real selected prompts, including the first peer-review correction. Continue recording meaningful experience without fabricating prompts or completed verification.

## Tool and role

OpenAI Codex desktop agent, GPT-6 (session-provided model identity; exact service variant not independently recorded). Used so far for reading the Lab 3 PDF, explaining scope in Thai, checking the local Lab 2 architecture, consolidating Issues and drafting the engineering contract. No coding-agent runtime feature implementation or peer approval is claimed yet.

The handout is source material distinct from the user's request. User chose to begin the six-Issue plan and explicitly emphasized polished UI consistent with the assignment. The agent isolated work from existing uncommitted Lab 2 report edits and based the new contract on completed remote main.

## Selected real prompt log

| No. | User request (original Thai) | Use / result so far |
|---|---|---|
| 1 | lab 3 มาแล้วอธิบายแล้วก็วางแผนที | Read 18-page handout and inspected mockups; explained scope/rules/deliverables and compared with existing Requester model/header context. |
| 2 | แล้วควรมีกี่ Issue | Proposed a dependency-aware 10-Issue decomposition; treated count as a proposal, not a handout requirement. |
| 3 | สามารถลดได้เหมือนเพราะต้องมารอเพื่อน Approve อีก | Consolidated to six Issues including release, with feature tests inside each and retained peer review. |
| 4 | ตอนนี้สามารถเริ่มเลยได้ไหม | Began the contract work item, checked GitHub/main, created isolated branch/worktree and drafted seven linked planning/evidence documents. |
| 5 | ขอ UI สวยๆ และให้ตรงโจทย์นะ | Strengthened UI contract with concrete dimensions/hierarchy, queue table/mobile cards, separate private/public composers, narrow Admin UI and visual checklist. |
| 6 | แก้เลยแล้วผมต้องรีวิวของเพื่อนควรแยกแชทไหม | Addressed Datakung's 2026-09-12 board/document mismatch review: return #26 to Backlog, correct #25 workflow and review records, preserve the separate local authentication draft, and prepare the correction for re-review. Recommended a separate conversation for reviewing the partner's repository. |

## Verification and limitations

Selected implementation prompt: “ทำ 3 ต่อเลย”, followed by “ทำต่อเลย” after interruption. Codex implemented the Issue #27 queue/operations/conversation and Requester indication, then used real PostgreSQL/API/UI/browser tests to verify them. Testing caught a PostgreSQL advisory-lock result decoding defect; it was corrected to execute the lock without decoding its void result. Two browser test selectors were refined when the new UI added owner options and nested select labels. Original tests were retained and the failures are recorded in tests.md. The agent's observations are not the student's personal reflection.

Compare the four contract documents and test mapping before handoff. Planned tests and screenshots remain Planned. Record actual checks in reviewer.md/tests.md after execution. Technical security decisions reference primary Node/OWASP sources in specification.md. A contract self-check is not an independent peer review.

## My Reflection

Peer-fix update (2026-09-21): the user said “เพื่อนส่งแก้มาแล้ว”. Codex read Datakung's two inline findings on PR #34, reproduced dirty navigation loss with five failing App-level regressions, implemented the navigation guard, and scoped browser success assertions to their actual text. The correction preserves mandatory authentication redirects. Results are recorded separately from the original implementation and the reviewer's independent run; no first-person student reflection or peer approval is inferred.

Issue #28 continuation (2026-09-20): the user asked “จัดการต่อเลย”. Codex continued the administrator API/UI on an isolated branch based on the approved PR #33 merge, wrote concurrency and UI/browser tests, and checked real responsive screenshots. The first browser run identified missing opener focus after dismissing the reset dialog; the implementation was corrected rather than weakening the assertion. Docker startup was recovered by preserving stale socket-only runtime directories; no factory reset or development-data migration was performed. Actual execution results belong in tests.md, not a claimed student reflection or peer review.

Implementation update: after actual contract approval/merge, the user requested “เริ่มทำต่อเลย”. Codex implemented the #26 schema/session/authentication/UI increment, migrated old tests to session identity, ran real PostgreSQL migration/regression tests and browser tests, and inspected selected screenshots. Initial failing tests and the interrupted browser run are retained in tests.md rather than presented as passes. The user's later “ถึงไหนแล้ว” prompted a factual progress report. This work does not constitute peer approval or the student's own reflection.

Pending the student's own reflection after specification review and implementation experience. Do not present AI-written first-person claims as the student's experience or verification. Suggested topics: whether the larger six-Issue scope reduced waiting, which assumptions peer review corrected, how contract-first tests preserved Lab 2 data, and how visual inspection changed the UI.
