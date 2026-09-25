# Lab 3 — Submission evidence draft

Prepared for Issue #29. This is a pre-release working draft, not the final PDF. Issue #30 owns the reviewed staging-to-main integration, final-main verification, final screenshot provenance and completed submission. Student name/ID, partner identity details and the student's final reading of the reflection must be completed before submission.

## Answer Part 1 — Repository and collaboration (10 points)

Repository: [auto4496/toktickit](https://github.com/auto4496/toktickit). [Project board](https://github.com/users/auto4496/projects/1). Feature branches target `lab3-staging`; the release PR will target `main`. Each feature requires independent review and is merged by the approving peer. See [Issue plan](issue-plan.md), [review records](reviewer.md) and [README](../../README.md).

Attach the final Git graph, actual review comments/responses/approval, Project Done evidence and repository tree after release. Do not represent #29 or #30 as Done before their reviewed merges.

## Answer Part 2 — Specification (5 points)

Include [specification.md](specification.md) and [api-spec.md](api-spec.md), covering requirements, roles, business rules, acceptance criteria and non-destructive migration. The contract was prepared before implementation in PR #31. Use its Git history as dated evidence; later amendments must remain identifiable.

## Answer Part 3 — Test plan and results (10 points)

Include [tests.md](tests.md) and [system-verification.md](system-verification.md). The latter maps the original planned filenames to actual suites. Tests cover real cookie authorization, retained Requester and Attachment behavior, status transitions, concurrency, account safety and UI/browser flows. Replace release placeholders with actual final-main commands, commit, counts and results; do not copy staging results as if run on main.

## Answer Part 4 — LLM use and reflection (5 points)

Include [ai-use.md](ai-use.md): tool identity, selected real prompts, observed defects/corrections and the Thai Reflection draft requested by the user. The student should read and revise the draft before submission; AI assistance does not establish the student's personal understanding.

## Answer Part 5 — Authentication (5 points)

Use integrated login-ready, validation, invalid-credential, busy/failure and mandatory-change captures. Busy/failure states explicitly use simulated responses. Real auth/API tests separately verify inactive accounts, session invalidation, CSRF and role protection. Existing browser authentication journeys verify password change and logout. Link screenshots through the [capture manifest](../../artifacts/lab-03/screenshots/system/manifest.json).

## Answer Part 6 — Queue and ticket details (5 points)

Show desktop/tablet/mobile queue and filters, Staff detail, no-results, failure recovery and not-found. Use the API queue suite for actual sorting, pagination and owner-filter correctness. Queue-empty and queue-failure evidence are synthetic presentation states, labelled in their filenames.

## Answer Part 7 — Ticket workflow (10 points)

Show Staff operations, separate public/private composers, real version conflict, terminal state, Requester public conversation/attachments and resolution indication. The full staff browser journey also covers claiming, priority, state changes, private-note authorization, attachment download, closing and reopening. See the actual status/role/concurrency API assertions in the test mapping.

## Answer Part 8 — User management (5 points)

Show directory, create/validation, edit and initial-password reset at required viewports. Browser tests cover create/edit/reset, forced password change, non-admin denial and dirty Back/Forward navigation. API tests cover duplicate email, self-deactivation, last-admin races and active assigned-owner restrictions. There is no delete or email-reset action.

## Answer Part 9 — UI specification and visual checks (5 points)

Include [ui-spec.md](ui-spec.md), curated screenshots and the actual inspection notes in [system-verification.md](system-verification.md). Viewports are 1440×900, 834×1112, 390×844 and a 320px overflow check. Automated geometry, keyboard and state assertions complement image inspection; they do not by themselves establish complete accessibility conformance. The final human checklist and reviewed-commit check remain release requirements.
