# LAB4 author review evidence

This is a feature-branch **REVIEW DRAFT**, prepared before the final hardening PR. It does not claim independent approval, a main merge, final-main acceptance or a completed student submission. Follow [release gates](../../../docs/lab-04/release.md) for the current status.

- Runtime/capture baseline: `5172f83b5470b980de45e40405b49a5ec3a73a26`, branch `codex/lab4-6-release-evidence`. The manifests preserve the actual working-tree state at observation.
- Latest full regression: 484 tests / 48 files; complete integrated browser suite: 32 cases; server and client production builds passed. Complete outputs and earlier author runs are retained separately, without adding their counts together. Evidence text normalizes trailing spaces and blank lines; result lines are retained.
- `manifest.json` records 75 selected captures at desktop, tablet and mobile widths. The three earlier phase manifests remain unchanged: 105 LAB4 captures in total.
- `dashboard-smoke.json` records an isolated fixture of 5,000 Tickets / 10,000 Actions, exact metric comparisons, bounded responses and six natural query plans. Timings are local smoke observations, not a production guarantee.
- `recovery.json` records the latest real backup/restore check; historical data-foundation evidence is preserved.
- `lab-4-review-draft.pdf` contains Answer Part 1-9 in order, 29 pages, 76 HTTPS link annotations and draft footers. All pages were rendered and visually inspected; focused screenshot excerpts link to the complete images. `report-provenance.json` records the PDF SHA-256 and source snapshot. `artifact-checks.json` records final structural and checksum checks.
- `project-snapshot.json` and `git-graph.txt` are dated preparation snapshots. Current review and release facts are maintained in the repository documents and GitHub.

The exact model names and student Reflection still require student confirmation. Independent final hardening review, reviewed staging-to-main integration, fresh main verification, all Issues Done and the final submission PDF remain release gates.

Regenerate the review PDF with `node scripts/lab-04/build-review-report.cjs`. It writes ignored `output/pdf/lab-4-review-draft.pdf` and `tmp/pdfs/report-provenance.json`; inspect the newly rendered pages before replacing the committed review copy and provenance. A regenerated draft is not final-main evidence.
