# LAB4 Final Author Verification - 2026-10-10

Work item [#48](https://github.com/auto4496/toktickit/issues/48). Branch `codex/lab4-6-release-evidence`, based on Datakung-approved/merged dashboard `72c5553`. This increment adds verification drivers, evidence and documentation, plus a scoped Follow-up checkbox CSS correction found during visual inspection. Backend/schema/dependency versions match the approved dashboard baseline. It is author feature-branch verification, with independent hardening review and final-main acceptance pending.

## Observed uninterrupted runs

| Command | Observed result | Source/provenance |
|---|---|---|
| `npm test` | 48 files / **484 passed**, 91.34s; exit 0 | `5172f83`; [full output](../../artifacts/lab-04/release/vitest-output.txt) |
| `npm run test:e2e:capture:release` (initial) | **31 passed**, 2.0m; exit 0; 48 screenshots published | `403e044`; [initial output](../../artifacts/lab-04/release/browser-initial-output.txt) |
| `npm run test:e2e:capture:release` (expanded, before checkbox polish) | **32 passed**, 1.9m; exit 0; 75 screenshots published | `4ab9c79`; [retained output](../../artifacts/lab-04/release/browser-before-polish-output.txt) |
| `npm run test:e2e:capture:release` (final after checkbox polish) | **32 passed**, 2.2m; exit 0; **75 screenshots published** | `5172f83`; [complete output](../../artifacts/lab-04/release/browser-output.txt), [manifest](../../artifacts/lab-04/release/manifest.json) |
| `npm run build:server` | TypeScript build passed; exit 0 | Backend matches `72c5553`; [output](../../artifacts/lab-04/release/build-server-output.txt) |
| `npm run build:client` | TypeScript/Vite build passed; exit 0 | After checkbox polish `5172f83`; [output](../../artifacts/lab-04/release/build-client-output.txt) |

All database suites ran sequentially on guarded loopback `127.0.0.1:55433`, database `lab3_test`, schema `lab4_test`, using dedicated container `toktickit-lab3-test`. Migration and scale checks use their own random isolated targets and clean them afterward. Browser and Vitest commands ran with NODE_PATH/DEBUG unset. Normal server-generated Prisma client resolution is retained. Build commands do not use the database and may run independently.

The browser expansion fills report evidence gaps: native required-field focus/draft preservation, three-width Action create/edit/validation, multiple Actions by different actors, and Dashboard loading/failure/empty/forbidden captures. The initial run remains recorded; the final 32 cases supersede it, not 63 distinct cases. The first two browser runs preceded visual polish. Inspection then found a native blue/oversized Follow-up checkbox: the scoped CSS now fixes its intrinsic size, green accent and 44px label target. Full 484-test regression, client build and complete browser capture were repeated after this correction; the latest output supersedes earlier runs. Historical full outputs are retained separately. Test counts describe distinct cases, not accumulated executions. Node's FORCE_COLOR/NO_COLOR notices appear in browser output; the real authenticated-route polish check observed no browser console errors, uncaught page errors or failing API reads.

## Scale and query-plan smoke (PERF-01)

New real integration test: `server/tests/lab-04/dashboard-smoke.integration.test.ts`. A freshly migrated, randomly named guarded schema contains 100 Requesters, 20 Staff, **5,000 Tickets and 10,000 Actions**. Both production dashboard handlers run against that real schema through their actual session middleware. Every metric is compared to independent database counts; recent lists remain five rows, contain no descriptions and have one bounded row query. Requester executes five data queries; Staff six. Setup batches stay below PostgreSQL parameter limits.

Observed in the full regression run: Requester **37.94ms / 1,312 bytes**, Staff **30.64ms / 1,568 bytes**. These single local observations include session/HTTP work and are not a load benchmark or percentile/SLA claim. The generous 5s smoke guard only catches gross degradation. [Machine-readable metrics and six EXPLAIN ANALYZE/BUFFERS JSON plans](../../artifacts/lab-04/release/dashboard-smoke.json) record natural planner choices; no planner setting forces indexes. Selective requester/assignee lookups use their indexes. Full status aggregation and global recent sorting may legitimately scan this small fixture; this test does not assert every query must use an index.

## Preserved data and security

The complete suite reran additive migrations, seed idempotency/preservation, real backup/restore, complete record/constraint and attachment SHA comparisons, authenticated retained download and removed-file denial. [Current recovery result](../../artifacts/lab-04/release/recovery.json) is separate from historical approved recovery evidence. Real authorization/CSRF, role/ownership, all 64 Ticket status edges, stale versions, concurrent Action/gate ordering, and idempotent recovery tests pass.

## Evidence and review limits

The final manifest records exact HEAD, branch, generation time and documentation/evidence working-tree state; it is not described as a clean main capture. All selected images must match its SHA-256/bytes before the report builder accepts them. Earlier Actions/workflow/dashboard manifests remain dated historical evidence. [Visual/accessibility checklist](visual-accessibility.md) records the author inspection. Final native zoom/student demonstration, model names/Reflection confirmation, independent final review and reviewed main release remain in [release.md](release.md).

No failed runtime test is omitted from this work item: the first scale check, both complete regression runs, both builds and all three complete browser runs passed. An unavailable optional PDF Python module and a text-output encoding mismatch were corrected while reading the brief; neither was a product test or acceptance result.
