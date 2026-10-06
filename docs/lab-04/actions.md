# Lab 4 Actions Taken API and UI

Work item: [Issue #42](https://github.com/auto4496/toktickit/issues/42), proposed in [PR #43](https://github.com/auto4496/toktickit/pull/43). Branch `codex/lab4-3-actions` starts from the independently reviewed data merge `c039a7d`.

## Implemented

- Staff/Admin create, edit/reassign, Start, complete and cancel Actions through role/session/CSRF checks. The server assigns creator/performer, validates active Staff/Admin assignees, normalized Unicode text, real calendar dates and required completion/follow-up fields.
- Ticket-row/account locks, version checks, atomic resulting revisions and create idempotency protect concurrent writes and retries. CLOSED/CANCELLED Tickets and terminal Actions reject mutations. Owning Requesters receive shared Action DTOs; other Requesters receive the same not-found envelope as missing resources, and history is Staff/Admin-only.
- A Ticket-scoped eligible-assignee endpoint includes active Staff **and** Admin accounts. Existing Ticket Owner eligibility and Staff-only Ticket-status permissions retain their Lab 3 rules.
- Ticket detail presents stable ordered/paginated Actions, forms, result/follow-up/attachment notes and read-only history. Start shows Starting…, disables competing controls, announces success, refreshes detail/list/history, and moves focus to the Action heading.
- Stale Start disables retry until Reload latest. Edit reload retains unsaved fields and retries with the latest version. Ambiguous Start failure uses safe feedback and also requires reload; successful writes with failed history refresh retain the known new state and block further mutation until reload. Form errors have labelled controls, linked messages and focused feedback.
- E2E cleanup removes Action revisions/create requests before Actions/Tickets, confined to fixture Ticket IDs. Linked dependency asset serving permits installed icon fonts in this worktree without broadening access beyond the workspace and installed dependency directory.

## Observed checks — 2026-10-06

- Initial focused API/component run: 2 files / 32 tests passed. Final full Vitest regression: **39 files / 424 tests passed** in one uninterrupted run, including 17 Actions API and 16 Action component cases plus retained Lab 1–3/data-foundation checks.
- Final Start/browser run: 5 tests passed across Staff/Admin, Requester read-only, real competing Admin edit, conflict reload/retry, ambiguous network failure, terminal restrictions, native confirmation-dialog focus and keyboard Start.
- Both production builds passed. The inherited client bundle exceeds 500 kB and emits a warning; it is not a build failure.
- [Screenshot manifest](../../artifacts/lab-04/actions/manifest.json): nine PNGs with dimensions, byte lengths and SHA-256, at 1440×900, 834×1112 and 390×844. These cover Staff started, Requester read-only and conflict states. Desktop Staff, mobile Requester and tablet conflict images were visually inspected: labels/status text/focus are visible, buttons do not overlap, and wrapping/automated overflow checks pass.
- The first local client build could not start the bundler under restricted process permissions. The rerun with the required process permission passed. Initial browser images omitted icon fonts because dependencies were linked outside the default serving list; the final run refreshed images after fixing that configuration. Neither limitation is hidden as a verified result.

The multi-actor journey was extended to two distinct IT Staff plus an Admin on the same Ticket; its final focused rerun passed **1 test** after that extension. The five-check browser run above preceded this extension; the four Start cases and extended shared-Ticket journey have all been observed passing. No Action-specific unit-validation file or standalone responsive-style file is claimed: validation is exercised through the actual API, and focus/overflow through component/browser checks.

## Reproduction

Configure guarded `.env.test.local` and the dedicated PostgreSQL test container. Generate the Prisma client after installing dependencies. Never run two database suites concurrently.

```text
npm test -- --reporter=dot
npm run test:e2e:actions
npm run build:server
npm run build:client
```

## Remaining

Independent Actions PR approval/integration is pending. Ticket resolution-gate changes, dashboards/open-filter alignment and final full browser/release verification belong to work items 4–6. This increment's passing checks do not complete all LAB4 acceptance criteria.
