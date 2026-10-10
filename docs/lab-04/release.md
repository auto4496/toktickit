# LAB4 Final Hardening and Release - Issue #48

Status: final author verification/report prepared in [PR #49](https://github.com/auto4496/toktickit/pull/49), from independently approved dashboard merge `72c5553`. Features #38/40/42/44/46 are closed/Done. The final hardening feature branch is `codex/lab4-6-release-evidence`; independent review and the subsequent staging-to-main release are pending. No final-main acceptance is claimed. The committed PDF is a pre-PR preparation snapshot; this checklist tracks later release facts.

## Completion gates

- [x] Independently approved contract, migration/recovery, Actions, Ticket workflow and dashboards integrated into staging.
- [x] Seed-scale smoke with exact dashboard metrics, bounded responses and natural query plans.
- [x] Complete author unit/API/integration/component regression and both production builds passed.
- [x] Complete expanded integrated browser run passed: 32 cases and 75 selected captures, including form/feedback evidence.
- [x] README migration, setup, guarded testing and demonstration instructions updated.
- [ ] Final hardening PR independently approved and merged into staging.
- [ ] Create/review staging-to-main release PR and record its actual peer-approved merge SHA.
- [ ] Fresh final-main full tests, integrated browser capture and both builds passed; record commands, exits and provenance.
- [ ] Confirm exact model names and student Reflection; finish/visually inspect one PDF with Answer Part 1-9.
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

The builder reads repository documents and verified local captures, blocks network requests while rendering, and creates ignored `output/pdf/lab-4-review-draft.pdf`. A committed review copy and its SHA/provenance are stored in `artifacts/lab-04/release/`. It cannot label a preliminary report as final. The final report must use final-main evidence and actual completed review/Project facts, and be rendered/visually inspected again.

## Final-main runbook

After Datakung merges the reviewed release, use a clean checkout of that exact main merge; record HEAD and working-tree state. Use fresh, separately named guarded unit/API and browser test targets. Deploy migrations and generate the server Prisma client, then run all commands above sequentially. Retain complete credential-free outputs, exits and the capture manifest with actual main SHA. Update the report's release status, Git graph and Project snapshot using observed facts. Keep failures/corrections in the run history. Any application correction goes through independent review before it can count as final acceptance.

Final evidence publication and the student's report are post-merge deliverables; they do not justify rewriting tested source history or pretending feature-branch results were run on main.
