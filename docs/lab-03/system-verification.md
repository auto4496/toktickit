# Integrated system verification — Issue #29

Branch: `codex/lab3-5-system-verification` → `lab3-staging`.
Integrated baseline: `2c6f79938ec17573e8727639c34e60eefbc190c5` (reviewed PR #34 merge).
Date: 2026-09-25. These are author/agent checks; peer approval and final-main verification are separate.

## Execution record

The first baseline regression run passed **383 cases in 35 files**, zero skips, in 406.57 seconds (17:55:39 Bangkok). Both production builds passed. The first four new responsive journeys passed at desktop/tablet/mobile/narrow widths before their conflict and keyboard scenarios were expanded.

New API-15 coverage injects failures through actual HTTP middleware for authentication, queue, detail, conversation and account listing. A real PostgreSQL transaction executes the comment append and then throws before commit; the test checks that both the append and ticket timestamp roll back. The migration fixture additionally compares the SHA-256 of a synthetic retained attachment file before/after each migration. This is test-fixture evidence, not a claim to have migrated or checksummed the user's development uploads.

Failures retained in the record:

- The first expanded browser capture passed the 13 inherited journeys, then timed out because an exact text-label selector did not match the priority select's accessible name. It was corrected to the explicit `combobox` role/name; no assertion was removed. The run was stopped after reproducing the selector issue and did not replace curated evidence.
- The next desktop run exposed Shift+Tab escaping the confirmation's action cycle. The shared confirmation now wraps Tab/Shift+Tab explicitly, closes its native dialog during cleanup and restores the original opener after unmount in Strict Mode. The reset-password dialog uses the same key handler. Browser checks retain the failing keyboard assertion and also check Escape/focus restoration.
- The first run including six new API cases passed 388/389, with the rollback fixture failing before exercising the endpoint because restoring a spy removed Prisma's proxy-provided transaction binding. The fixture now retains/restores the original bound method between cases. This was a test setup correction, not a server rollback failure.
- Image inspection caught a requester indication capture while conversation history was still loading. Capture now awaits that region's explicit ready state instead of using a delay.
- A full run concurrent with browser/build work hit the existing 30-second Prisma subprocess timeout in the migration fixture. It was stopped, not counted as a pass. The final regression runs alone after those processes finish; neither the assertion nor its timeout was relaxed.
- Reusing that interrupted run's database exposed an orphaned synthetic category fixture. The final full suite therefore uses a newly created `lab3_verification_unit_test`, without deleting or modifying development data. The same run also found that StaffWorkflow's jsdom dialog stub implemented `showModal` but not `close`; its stub was completed to match the browser API used by the verified cleanup. Production behavior and assertions were retained.

Final browser capture passed **17/17 journeys**, zero skips, in **3.8 minutes**, exit 0. Both production builds passed after the focus correction. Capture completed at **2026-09-25 23:31:23 Bangkok** from source commit `08d37115e4f8c3367642a8753260044fb3181975`; the only dirty path at manifest creation was the newly generated screenshot directory. All 109 PNG checksums were independently verified against the manifest. The subsequent jsdom stub correction does not change the captured application or browser test source; final evidence commits record results separately.

Final full `npm test`: **389/389 cases in 36/36 files**, zero skips, exit **0**, **194.97 seconds**, started **2026-09-25 23:35:56 Bangkok**. Source commit: `5a0934e8e4c89c75f03b5817bfc48fdf1cd30479`. Database: freshly created `lab3_verification_unit_test`. This includes all six API-15 cases, all three migration/seed cases and the completed jsdom dialog stub. The captured application and browser tests are unchanged from `08d3711`.

Local Markdown links: **157 checked**, none missing. All **109** image checksums match the manifest. `git diff --check` passes. These results establish the author verification baseline for peer review; final-main verification remains pending.

## Reproduction and isolation

Install dependencies in root, `server` and `client`, then run `npm run prisma:generate`. Configure a guarded `TEST_DATABASE_URL` using `.env.test.example`. Use separate databases for Vitest and Playwright; on resource-constrained machines run the suites sequentially. Earlier attempts used `lab3_test`; the clean final Vitest run uses `lab3_verification_unit_test`, and browsers use `lab3_verification_test`, all in the test-only PostgreSQL container on loopback port 55433. No development database reset/migration or Docker factory reset was performed.

```powershell
npm test
$env:E2E_CLIENT_PORT = '3400'
$env:E2E_API_PORT = '5400'
npm run test:e2e:lab3
npm run build:server
npm run build:client
# Explicit evidence refresh: runs the full browser suite, copies only on success.
npm run test:e2e:capture:lab3
```

Vitest/API fixtures use real sessions and real transactions where applicable; UI component tests intentionally mock HTTP. Playwright starts its own servers. The capture manifest records baseline commit, dirty paths, timestamp and image SHA-256 values. Routine runs never overwrite curated images. Its source snapshot is author evidence; it must not be described as a peer-approved/final-main commit until the relevant review occurs.

## Actual test mapping

The matrix in tests.md retains the original acceptance scenarios, with filenames updated to the consolidated implementation. Some acceptance rows intentionally span API, component and browser evidence rather than one isolated file.

| Planned IDs | Actual evidence |
|---|---|
| UNIT-01/02, API-01–04 | `server/tests/lab-03/auth.unit.test.ts`, `auth.api.test.ts`, `authorization.api.test.ts`; session reset/role/activity also `admin-users.api.test.ts` |
| UNIT-03–05, API-05–11 | `server/tests/lab-03/staff-workflow.api.test.ts`; retained query parsing in `server/tests/lab-02/ticket-query.unit.test.ts`; account-validation portion in `admin-users.api.test.ts` |
| API-12–14 | `server/tests/lab-03/admin-users.api.test.ts`, including actual account/ticket races |
| API-15 | `server/tests/lab-03/safe-errors.api.test.ts`; inherited queue and attachment failure cases |
| MIG-01–03 | `server/tests/lab-03/migration.integration.test.ts` (preservation, collision/initializer and repeat seed); synthetic attachment checksum |
| REG-01/02 | Existing `server/tests/lab-02/` create/list/detail/requester-context/attachment suites, now using real session cookies |
| UI-01–03 | `client/tests/lab-03/Login.test.tsx`, `ChangePassword.test.tsx`, `ApplicationShell.test.tsx`, `ReviewRegressions.test.tsx` |
| UI-04–07 | `client/tests/lab-03/StaffWorkflow.test.tsx`, `ConversationRecovery.test.tsx`; `client/tests/lab-02/RequesterTicketDetail.test.tsx` |
| UI-08 | `client/tests/lab-03/UserManagement.test.tsx`, `AdminNavigation.test.tsx` |
| STYLE-01, RESP-01 | Retained Lab 2 ZenGreenStyles/ResponsiveStyles component suites; real browser state/overflow/layout checks in all three Lab 3 specs; agent image inspection |
| E2E-01 | `e2e/lab-02/authentication.spec.ts` and `e2e/lab-03/system-verification.spec.ts`; inactive credentials/session expiry also real auth API tests |
| E2E-02 | `e2e/lab-03/staff-ticket-flow.spec.ts` plus system conflict/terminal/requester captures |
| E2E-03 | `e2e/lab-03/admin-users.spec.ts`; duplicate/self/last-admin/owner invariants also real Admin API tests |
| VIS-01 | All three Lab 3 specs; `e2e/lab-03/capture-evidence.mjs`; image inspection below |
| REL-01 | Pending Issue #30: reviewed release, final-main checks and final PDF |

## Screenshot index and visual inspection

Curated root: [system screenshots](../../artifacts/lab-03/screenshots/system/). [Manifest](../../artifacts/lab-03/screenshots/system/manifest.json) enumerates the exact images and checksums. All accounts and ticket/file data are synthetic. Viewports: desktop 1440×900, tablet 834×1112, mobile 390×844, narrow 320×900.

| Folder | Scenes |
|---|---|
| `screenshots/` | Five retained authentication captures from the existing real login/password-change journey |
| `staff-workflow/` | Real queue and filters, Staff detail and private conversation at all four widths |
| `user-management/` | Directory, current-account editor/self-protection and reset dialog at all four widths |
| `system-states/` | Login ready/invalid/validation/busy/failure, mandatory change, queue no-results/empty/failure/retry, public/private detail, real conflict, terminal/not-found, requester attachment/indication, restricted Admin detail and create validation |

Filenames containing `simulated` use controlled browser responses for reproducible busy, unavailable and empty presentation states. Other system scenes use real application/API/database state. Browser assertions verify no document overflow, error focus, private-draft separation, restricted controls, conflict reload, confirmation key cycling and opener restoration. The legacy responsive suite also exercises long labels/filenames. Screenshots alone do not establish correct API authorization or complete WCAG conformance.

Agent visual inspection on 2026-09-25 covered the desktop queue and login failure, tablet account editor/create validation/terminal detail, mobile private conversation and Requester indication, and 320px reset/create validation. Full-page captures were opened and inspected, not inferred from passing geometry assertions.

- [x] Consistent green/white action hierarchy, readable headings and separated cards in the inspected scenes.
- [x] Desktop six-column queue retains priority/owner information and pagination; narrow layouts stack controls without document overflow.
- [x] Private conversation has an amber notice and distinct tab; Requester evidence contains public history only. The test asserts that a private draft never populates the public composer.
- [x] Conflict alert explains reloading while preserving the attempted choice; terminal screens keep readable history and remove the composer.
- [x] Administrator form errors wrap at 320px and focus the first invalid input; current-account editor explains the disabled Active switch. No delete/bulk/email-reset actions appear.
- [x] Dialog actions and focus rings are visible; keyboard wrapping and Escape/opener restoration are verified by the browser assertions. Narrow reset has readable warning text and masked/empty password fields.
- [x] Selected stylesheet color pairs were numerically checked using WCAG relative luminance: primary/white **6.63:1**, body/white **13.30:1**, muted/white **6.14:1**, warning badge **4.55:1**, error **6.05:1**. These five checks do not claim an exhaustive contrast audit or include disabled controls.
- [x] Captures have an exact source commit and verified PNG checksums. They are author evidence awaiting peer review.

The student/reviewer must still inspect the final reviewed version and native browser zoom before submission; no human approval or complete accessibility conformance is inferred from the agent checks. The final human checklist in ui-spec.md remains explicitly separate.

## Submission boundary

[submission-draft.md](submission-draft.md) prepares Answer Parts 1–9. [ai-use.md](ai-use.md) contains the requested Reflection draft and real selected prompts. Issue #29 does not mark the release Done, claim final-main test results or create a final PDF from unreviewed staging. Those actions remain Issue #30 after this PR's peer approval and merge.
