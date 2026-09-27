# Lab 3 final-main evidence

Application tested: `b3a65949f3fad3c84ffabbe01707db0d929686f0` (reviewed and merged PR #36).

**Technical evidence complete; student acceptance pending.** The artifact-only `codex/lab3-final-evidence` branch publishes post-merge evidence without changing reviewed application source. [Issue #30](https://github.com/auto4496/toktickit/issues/30) remains the acceptance tracker.

- [30-page Answer Part 1-9 PDF](lab-3-submission.pdf)
- [Acceptance checklist and environment history](acceptance.md)
- [Exact results](results.json): 389 unit/API/UI/regression tests, 17 browser tests and both builds passed.
- Complete logs: [unit](unit.log), [browser](browser.log), [server build](server-build.log), [client build](client-build.log), [database migration](migration.log).
- [Fresh database runbook](test-database-runbook.md), including migration before npm test as requested in peer review.
- [109-image index](screenshots/README.md), [unaltered raw manifest](screenshots/manifest.json), [final-main provenance clarification](capture-provenance.json).
- [Agent visual inspection](visual-inspection.md); [Reflection for student reading/adaptation](reflection-for-student.md).
- [Actual peer reviews](github-review-snapshot.json).
- [Bundle SHA-256 manifest](bundle-manifest.json), [PDF link audit](pdf-link-audit.json).

The PDF retains the reviewed specification, current test scenario/file matrix, complete passing output, nine actual AI prompts and selected images. Repeated staging history remains linked. Full-size captures supplement labelled excerpts.

## Report reproduction

In a checkout of the application SHA above, install locked root dependencies. Copy this evidence directory to output/lab-03-final/ and copy build-submission.cjs to tmp/final-report/build-submission.cjs. Run `node tmp/final-report/build-submission.cjs`. It uses reviewed report helpers, validates successful source-matched results and screenshot hashes, and writes output/pdf/lab-3-submission.pdf. Playwright Chromium must be installed. PDF metadata timestamps may differ on regeneration.

Do not set humanAcceptance flags without explicit student confirmation. Update acceptance wording, Reflection and final Project evidence together when those actions actually occur.
