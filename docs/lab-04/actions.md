# Lab 4 Actions Taken API and UI

Work item: [Issue #42](https://github.com/auto4496/toktickit/issues/42), approved and merged through [PR #43](https://github.com/auto4496/toktickit/pull/43). Datakung approved `935bcdf` and merged `68a88cc` on 2026-10-07, independently passing 431 tests, seven Actions browser tests and both builds. Issue #42 is closed/Done. Branch `codex/lab4-3-actions` started from the reviewed data merge `c039a7d`; dated sections below retain historical author checks and review progression.

## Implemented

- Staff/Admin create, edit/reassign, Start, complete and cancel Actions through role/session/CSRF checks. The server assigns creator/performer, validates active Staff/Admin assignees, normalized Unicode text, real calendar dates and required completion/follow-up fields.
- Ticket-row/account locks, version checks, atomic resulting revisions and create idempotency protect concurrent writes and retries. CLOSED/CANCELLED Tickets and terminal Actions reject mutations. Owning Requesters receive shared Action DTOs; other Requesters receive the same not-found envelope as missing resources, and history is Staff/Admin-only.
- A Ticket-scoped eligible-assignee endpoint includes active Staff **and** Admin accounts. Existing Ticket Owner eligibility and Staff-only Ticket-status permissions retain their Lab 3 rules.
- Ticket detail presents stable ordered/paginated Actions, forms, result/follow-up/attachment notes and read-only history. Start shows Starting…, disables competing controls, announces success, refreshes detail/list/history, and moves focus to the Action heading.
- Stale Start disables retry until Reload latest. Edit reload retains unsaved fields and retries with the latest version. Ambiguous Start failure uses safe feedback and also requires reload; successful writes with failed history refresh retain the known new state and block further mutation until reload. Form errors have labelled controls, linked messages and focused feedback.
- Ambiguous creation retains the original submitted payload and Idempotency-Key independently of later draft edits. Recover saved Action replays that exact request, then retains the current draft in edit mode against the recovered Action/version. Save applies edits via PATCH; no second Action is created. Failed recovery retains the draft and can be retried; definitive creation errors allow correction with a new key.
- Recovery also releases Save/Cancel after known server rejection codes establish that no Action was committed (validation, ineligible assignee, read-only Ticket or missing resource). It retains the current draft, presents returned field errors and rotates the key for a corrected create. Network failures, server errors, authentication failures, unknown responses and reused-key conflicts retain the original recovery attempt because they do not establish its earlier outcome.
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
npm run test:e2e:capture:actions
npm run build:server
npm run build:client
```

## Remaining

Actions approval/integration is complete. Ticket resolution-gate changes, dashboards/open-filter alignment and final full browser/release verification belong to work items 4–6. This increment's passing checks do not complete all LAB4 acceptance criteria.

## Corrections after Datakung's review — 2026-10-06

Datakung requested changes on `29480eb`, independently reproducing an edited draft stranded after a committed creation response was lost, and all nine curated PNGs being overwritten by routine browser tests without a manifest refresh. The peer independently passed the original 424 tests, five browser journeys and both production builds on separate disposable databases.

The creation recovery above addresses the first finding. A real-browser test commits POST through `route.fetch`, drops its response, edits the draft, then verifies recovery reuses the exact original body/key, receives the replay header, and saves the later edits to the same ID. Final state is one Action/version 2 with only CREATED and EDITED revisions.

Routine captures now write only to ignored `test-results/lab-04/actions/screenshots`. The explicit `test:e2e:capture:actions` command first runs the complete Actions suite, validates all nine scene/width PNGs, then publishes them and refreshes timestamps, dimensions, bytes and SHA-256 together. A failed suite exits before publication.

Observed correction checks: **18 Action component tests passed** (including offline recovery retry and definitive creation-error correction); client production build passed. Complete routine Actions suite: **6 browser tests passed**; all nine curated hashes still matched and `git diff --exit-code -- artifacts/lab-04/actions` remained clean afterward. The explicit publisher independently ran the complete suite again: **6 tests passed**, then published nine PNGs with a refreshed manifest; all nine hashes and byte lengths matched. Mobile Staff and tablet conflict images were visually inspected after publication, with readable text, focus and wrapping. Relative document links, AC traceability and whitespace checks passed. The original full 424-test result is retained as a historical check; no full 426-test rerun is claimed.

## Definitive rejection recovery — 2026-10-07

Datakung's re-review of `25b478c` independently passed **426 tests**, **six browser tests** and both production builds, and confirmed the original two findings were fixed. The remaining finding was recovery continuing to replay a rejected payload while Save/Cancel stayed disabled.

Creation failure classification is now shared by Save and Recover saved Action. Known rejection codes clear the attempted body/key, retain all current draft fields, display validation feedback and enable correction/cancellation. Unknown or ambiguous failures retain the original key/payload to prevent duplicates, including expired authentication during recovery of a potentially committed request.

Observed corrected checks: **23 component tests passed**, including lost response followed by validation/ineligible-assignee rejection and a fresh corrected create, plus retained-key protection after server, reused-key and authentication errors. **Seven Actions browser tests passed**. The new browser case uses the real API to reject a whitespace-only description, drops the first 400 response, edits the draft, and confirms recovery returns the original rejection before enabling Save/Cancel. Saving uses a fresh key; the final Ticket has one Action/version 1 and only a CREATED revision. Client production build passed; the existing bundle warning remains.

The initial component run had two test-selector failures because inline field-error text is part of the label; using the labelled field's caption prefix corrected the selectors, and the final 23-test run passed. No production behavior was changed to bypass assertions. The seven-test routine browser run preserved all nine curated image hashes/byte lengths and left the screenshot/manifest diff empty. No full 431-test author run was claimed at this stage; subsequent independent approval is recorded below.

## Independent integration — 2026-10-07

Datakung approved `935bcdf` at 14:20:46 Asia/Bangkok and merged PR #43 at 14:21:02 as `68a88cc`. The final review independently passed all 431 committed tests, seven browser checks, independent recovery cases and both production builds. All findings were corrected. Issue #42 is closed/Done; Ticket workflow now proceeds as Issue #44 from that reviewed merge.
