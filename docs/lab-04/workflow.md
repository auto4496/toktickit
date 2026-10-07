# Lab 4 Ticket Workflow and Resolution Gate

Work item: [Issue #44](https://github.com/auto4496/toktickit/issues/44). Branch `codex/lab4-4-ticket-workflow` starts from approved Actions merge `68a88cc` into `codex/lab4-staging`.

## Implemented

- Formal RESOLVED requires a documented COMPLETED Action and no PLANNED/IN_PROGRESS Actions. A bounded aggregate query counts only the current Ticket and treats Unicode whitespace-only Results as blank. It returns counts rather than Action content/history.
- Status validation, expectedVersion, active owner and confirmation retain their Lab 3 rules and precedence. The gate runs inside the existing shared account/Ticket-lock transaction used by Action writes, before status/version/timestamp changes. Failed resolution leaves the complete Ticket row unchanged.
- Staff/Admin detail returns `resolutionGate` with one repeatable-read snapshot. Staff operational mutation responses return fresh readiness; Requester DTOs/indication remain unchanged and advisory. Admin may work on Actions but cannot change Ticket status. Close/reopen/cancel retain history; existing resolved Tickets need no backfill to close.
- Staff detail disables RESOLVED until readiness and active owner permit it, displays counts and allows explicit refresh. Action callbacks refresh Ticket/readiness while retaining owner/priority drafts. Failed readiness fetch blocks Resolve and allows retry; stale readiness rejected by the server refreshes counts and retains the status choice with announced/focused feedback. Unknown status outcomes require explicit latest-detail reload; pending writes use a ref lock as well as disabled controls. Older refresh snapshots cannot replace a newer Ticket version.
- Retained Lab 3 status-matrix/admin-race fixtures now include a valid completed Action where formal resolution is exercised. Existing Staff/system browser journeys create and complete a real Action before resolution; fixture cleanup deletes Action requests/revisions before rows. Staff-only Owner/status permissions retain their earlier behavior.
- Routine workflow screenshots write to ignored test-results. Explicit publication runs the complete workflow browser suite before validating/publishing all twelve three-width screenshots with a fresh hash/byte/dimension manifest.

## Observed checks — 2026-10-07

- Initial focused gate/API/UI run: three files / **27 tests passed**. It emitted React act warnings; async confirmation/finish steps were subsequently wrapped for the final regression run.
- Server and client production builds passed. Client retains the inherited bundle-size warning.
- Full Vitest regression: **42 files / 458 tests passed** in one uninterrupted run, retaining all Lab 1–3/data/Actions tests and adding seven unit, eleven API and nine component cases. All 64 raw status edges remain exercised by the retained Staff suite. Final run emitted no earlier act warnings. The recovery test reran successfully; its generated dated JSON was restored to the previously approved snapshot, and the new regression result is recorded here.
- Workflow browser publication: **two tests passed**, followed by twelve PNGs and [manifest](../../artifacts/lab-04/workflow/manifest.json) at 1440×900, 834×1112 and 390×844. Owning Requester indication remains advisory; Admin cannot Resolve; completed work enables Resolve; close/reopen retain Action rows/revisions; a real independent Admin creates an unfinished Action after readiness loads, producing server rejection, keyboard focus and explicit retry after cancellation.
- Retained Actions browser regression: **seven tests passed**, including both lost-create-response recovery paths, Staff/Admin Start, Requester privacy, stale versions, ambiguous failures, terminal restrictions and the two-Staff-plus-Admin journey. Routine runs preserved the nine approved Actions PNGs/manifest.
- All twelve workflow and nine Actions hashes/byte lengths matched. Representative mobile blocked, tablet gate rejection and desktop ready captures were visually inspected; text wraps, feedback focus is visible and controls do not overlap. Automated overflow checks passed at all three widths.
- The first workflow browser publication had one pass and one assertion failure: Playwright reported the native disabled `<option>` as enabled for its generic disabled matcher. Assertions now check the actual `disabled` DOM property for both blocked/ready states. The complete final suite passed; the failed run published no evidence, verified before retry.
- Affected Lab 3 Staff/system browser regression: **five tests passed** (retained Staff conversation/attachment/advisory/Admin/reopen journey plus desktop/tablet/mobile/320px system verification). Together with two workflow and seven Actions checks, **14 browser cases passed across three sequential suites**. Independent peer approval remains pending; this affected subset is not the final full legacy browser/release gate.

## Reproduction

Use the guarded test-only PostgreSQL instance and `.env.test.local`; database suites run sequentially.

```text
npm test -- --reporter=dot
npm run test:e2e:workflow
npm run test:e2e:capture:workflow
npm run test:e2e:actions -- --grep-invert E2E-02
npm run test:e2e:lab3 -- e2e/lab-03/staff-ticket-flow.spec.ts e2e/lab-03/system-verification.spec.ts --grep "E2E-02|SYSTEM responsive"
npm run build:server
npm run build:client
```

## Remaining

Independent review/integration remains pending. Dashboard/list drill-down alignment, performance, final full browser/release verification and submission report remain work items 5/6.
