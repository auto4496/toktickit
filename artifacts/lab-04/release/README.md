# LAB4 review report and historical author evidence

The current **lab-4-review-draft.pdf** is the refreshed report with eight edited technical prompt summaries, verified model IDs and project-based Reflection. Its runtime outputs/images come from the fresh reviewed-main runs under [../final-main/](../final-main/). It supersedes the earlier conversation-based AI-use section; older PDF versions remain identifiable in Git history.

report-provenance.json records the current report-source snapshot, actual main runtime SHA and PDF checksum. artifact-checks.json records structural/checksum checks and rendered visual inspection. The report remains a REVIEW DRAFT pending student final read-through/demonstration/native zoom and final submission closeout; no all-Issues-Done claim is made.

Other files in this directory remain historical author feature-branch runtime evidence:

- Runtime/capture baseline 5172f83b5470b980de45e40405b49a5ec3a73a26; branch codex/lab4-6-release-evidence. Manifest time/source state are preserved.
- Complete author regression: 484 tests / 48 files; browser suite: 32 cases; both builds passed. Earlier runs are retained separately without accumulating case counts. Text outputs normalize trailing whitespace.
- manifest.json contains 75 author captures. Earlier Actions/workflow/dashboard manifests contain another 30. The fresh-main directory adds 75 independently captured main images.
- dashboard-smoke.json and recovery.json belong to these author runs. Current main scale/recovery results are in ../final-main/.
- project-snapshot.json and git-graph.txt are dated preparation snapshots, not a current completed-Project claim.

Regenerate the current report with node scripts/lab-04/build-review-report.cjs. It validates the main capture manifest, reads current repository documents and writes output/pdf/lab-4-review-draft.pdf plus tmp/pdfs/report-provenance.json. Inspect the rendered pages before replacing the stable review copy/provenance.

See [current release gates](../../../docs/lab-04/release.md) and [main verification](../../../docs/lab-04/main-verification.md).
