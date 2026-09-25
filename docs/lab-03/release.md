# Release integration and submission - Issue #30

Status: Started on 2026-09-26. This is the sixth planned work item, using `lab3-staging -> main`. Feature Issues #25-29 are complete. The application baseline is the peer-merged PR #35 commit `e685eec892d2b09fdeeeafcb8dc0c253ae6c4f31`. Release preparation changes documentation and the report builder only.

## What is already verified

Datakung approved PR #35 head `3d251ce2ecdf074bb18792f0b7aae85a0589645a`, independently passing 389 tests, 17 browser journeys and both builds, and matching all 109 image checksums. Approval: 2026-09-25 18:07:08 UTC; peer merge: 18:07:29 UTC. See [review history](reviewer.md), [actual run and failure history](system-verification.md), and [capture manifest](../../artifacts/lab-03/screenshots/system/manifest.json).

These checks found no remaining blocker. They are not a promise that every possible bug is absent, and they are not final-main verification. Release documentation and PDF preparation do not change the reviewed application.

## Review boundary and completion checklist

- [x] Features #25-29 independently reviewed and merged into staging.
- [x] Release work begins from the actual PR #35 merge, preserving the contract and earlier evidence.
- [ ] Release PR formally linked to #30, Project moved to PR Review, and live relationship/status verified.
- [ ] Peer reviews the release head and performs the staging-to-main merge.
- [ ] Record the actual main merge SHA and rerun all suites and both builds on that checkout.
- [ ] Capture final-main screenshots with truthful provenance; retain complete command outputs, including any failures and corrections.
- [ ] Student reads/adapts the Reflection and performs the human visual/native browser zoom checks in [ui-spec.md](ui-spec.md).
- [ ] Finish one PDF with Answer Part 1-9, working links, readable screenshots, rendered contract/review/test/AI/UI documents, final graph and completed Project evidence.
- [ ] Close #30 and move it to Done only after the above acceptance evidence is complete. If GitHub closes the linked Issue automatically on merge, reopen it until these post-merge checks are finished.

Do not self-approve or self-merge. Do not copy staging results under a final-main label. If a substantive defect appears, fix it through a reviewed correction instead of bypassing review to retain the six-PR estimate.

## Reproducing the review PDF

The report is deliberately marked **REVIEW DRAFT** on every page. It renders the existing source documents, includes selected staging captures and links the full image index. Historical pending statements retain their original dates; the current status above and at the top of reviewer.md takes precedence. The student's Reflection remains an explicitly labelled AI draft.

After installing the root dependencies with `npm ci` and the Playwright Chromium browser with `npx playwright install chromium`:

```powershell
node scripts/lab-03/build-review-report.cjs
```

Outputs are ignored local artifacts: `output/pdf/lab-3-review-draft.pdf` and `tmp/pdfs/lab-3-review-draft.html`. The builder reads only repository files, verifies every screenshot SHA-256, embeds local images, disables network requests during rendering and prints with Chromium. It requires an installed Thai font (Tahoma on Windows or Noto Sans Thai on Linux) for the original prompt log and Reflection. Inspect the rendered PDF, including Thai text, before sharing it.

The builder intentionally cannot label this preliminary report as final. After the actual merge, add the final-main execution logs and acceptance evidence, replace pending sections, and render/inspect the completed submission. Do not simply remove the draft footer.

## Final-main runbook (pending actual merge)

Use a clean checkout of the actual peer-merged main and record `git rev-parse HEAD` and `git status --short` before testing. Install root, server and client dependencies as documented in [README](../../README.md), then generate Prisma. Use fresh, separately named test-only PostgreSQL databases, for example `lab3_release_unit_test` and `lab3_release_browser_test`, accepted by the existing test-database guard. Do not use development data or reuse a database left by an interrupted suite.

Run sequentially and preserve each command's complete output and exit code:

```powershell
# Set TEST_DATABASE_URL to the fresh unit/API test database first.
npm run prisma:generate
npm test
# Change TEST_DATABASE_URL to the separate fresh browser test database.
$env:E2E_CLIENT_PORT = '3500'
$env:E2E_API_PORT = '5500'
npm run test:e2e:capture:lab3
npm run build:server
npm run build:client
git diff --check
```

The capture command runs the whole browser suite and copies images only after success. Its existing manifest note describes staging; after a final-main run, preserve the exact captured SHA, time and dirty-path fields and explicitly annotate that this capture was run on the verified main checkout. Do not change source to obtain a cleaner-looking provenance record. Capture output makes the working tree dirty only after the run; distinguish that generated evidence from application changes.

Store final logs, actual release review/merge facts and the final PDF as linked release evidence on Issue #30. Record final Project and Git history after acceptance. The post-merge evidence attachment does not require inventing another feature Issue. A source-code correction does require a new reviewed change.
