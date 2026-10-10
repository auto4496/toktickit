# LAB4 Final Hardening and Release - Issue #48

Status: Datakung approved/merged final hardening [PR #49](https://github.com/auto4496/toktickit/pull/49) and release [PR #50](https://github.com/auto4496/toktickit/pull/50). Actual main merge: 7a697d2. Fresh main verification passed 484 tests / 48 files, 32 browser cases and both builds; see [main-verification.md](main-verification.md). The AI-use document and PDF now use eight edited technical prompt summaries and verified model IDs. Student final read-through/demonstration/native zoom and final submission closeout remain pending.

## Completion gates

- [x] Independently approved contract, migration/recovery, Actions, Ticket workflow and dashboards integrated into staging.
- [x] Seed-scale smoke with exact dashboard metrics, bounded responses and natural query plans.
- [x] Complete author unit/API/integration/component regression and both production builds passed.
- [x] Complete expanded integrated browser run passed: 32 cases and 75 selected captures, including form/feedback evidence.
- [x] README migration, setup, guarded testing and demonstration instructions updated.
- [x] Final hardening PR #49 independently approved and merged into staging as 27272813.
- [x] PR #50 independently reviewed and merged into main as 7a697d24120977cfdabc7470c41f88d44fdf2f30.
- [x] Fresh final-main full tests, integrated browser capture and both builds passed; complete outputs, exits and clean-source provenance retained.
- [x] Verify exact model IDs and prepare eight technical prompt summaries plus a project-based Reflection at the student's request.
- [ ] Student final read-through, demonstration/native zoom and final submission PDF closeout.
- [ ] Record final Git graph, reviewer outcomes and Project with all LAB4 Issues Done; close #48 only after post-merge acceptance.

The report remains a **REVIEW DRAFT** while any release/student gate is pending. If GitHub closes #48 automatically on the main merge, reopen it until final-main verification and submission evidence are complete. Do not self-approve or self-merge the release.

## Reproduce author verification

Install root/server/client dependencies and Chromium as in [README](../../README.md). Configure `.env.test.local` for a dedicated guarded PostgreSQL test database/schema, distinct from development. The complete suite also exercises real backup/restore using the dedicated test container. Database suites run sequentially; no NODE_PATH workaround is needed.

```powershell
npm run prisma:generate
npm test
npm run test:e2e:capture:release
npm run build:server
npm run build:client
git diff --check
```

The performance test writes `tmp/dashboard-smoke.json`; recovery writes its dated evidence. Preserve the newly observed recovery output under the release evidence rather than silently replacing historical approved evidence. Browser publication requires complete success and validates all selected PNGs first. Current evidence and scope: [final-verification.md](final-verification.md).

## Report reproduction

```powershell
node scripts/lab-04/build-review-report.cjs
```

The builder reads repository documents and verified local captures, blocks network requests while rendering, and creates ignored `output/pdf/lab-4-review-draft.pdf`. The current review PDF and its SHA/provenance are stored at the stable `artifacts/lab-04/release/` paths. Its runtime evidence now comes from `artifacts/lab-04/final-main/`; earlier author runtime logs/images remain separate under release/. It cannot label a preliminary report as final. The final report must use final-main evidence and actual completed review/Project facts, and be rendered/visually inspected again.

## Final-main runbook

Executed after the reviewed release; retain as the reproduction runbook. Use a clean checkout of the exact main merge; record HEAD and working-tree state. Use fresh, separately named guarded unit/API and browser test targets. Deploy migrations and generate the server Prisma client, then run all commands above sequentially. Retain complete credential-free outputs, exits and the capture manifest with actual main SHA. Update the report's release status, Git graph and Project snapshot using observed facts. Keep failures/corrections in the run history. Any application correction goes through independent review before it can count as final acceptance.

Final evidence publication and the student's report are post-merge deliverables; they do not justify rewriting tested source history or pretending feature-branch results were run on main.
