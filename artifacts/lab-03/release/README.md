# Lab 3 release review artifact

[Review PDF](lab-3-review-draft.pdf) - **not the final submission**. Prepared from source commit `aab88a11a144ad966127c9dd1ffe505935b4ac5d`, before the release PR was opened. The document preserves that preparation-time status; the live [release Issue #30](https://github.com/auto4496/toktickit/issues/30) and [release checklist](../../../docs/lab-03/release.md) track later handoff/review events.

The 50-page review copy renders the complete existing specification, test plan, reviewer history, AI-use record, UI specification and README, with Answer Part 1-9 in order. All pages were rendered and visually inspected. Wide test matrices use landscape pages; long screenshots use labelled excerpts with full-size links. Thai prompts and the explicitly labelled Reflection draft remain readable.

Generation reverified 109 source screenshot SHA-256 values. PDF checks verified the nine ordered headings, draft footer on every page, 66 distinct HTTPS link targets, and existence/type of repository file/directory targets. These are link structure/local-target checks, not a claim that every external site was independently fetched. The [manifest](manifest.json) records this PDF's SHA-256 and exact source commit.

The 389 tests, 17 browser journeys and builds described in the report belong to the approved staging baseline. Final-main execution outputs, final screenshots, release approval/merge, completed Project evidence and the student's human checks remain pending. The final submission must update those facts and can condense repeated historical material while preserving required evidence. Do not submit this review copy unchanged.

Reproduce with `node scripts/lab-03/build-review-report.cjs` from an installed checkout; new local output goes to ignored `output/pdf/`. A later regeneration reflects the then-current source and is not expected to have the same PDF checksum or timestamp. The committed snapshot is intentional review evidence, not a routine generated build output.
