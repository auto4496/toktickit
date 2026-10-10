# LAB4 Fresh Main Verification

Actual reviewed main merge: **7a697d24120977cfdabc7470c41f88d44fdf2f30**, [release PR #50](https://github.com/auto4496/toktickit/pull/50). Datakung approved staging head 27272813 at 2026-10-10 23:11:49 Asia/Bangkok and merged at 23:11:59. The release tree matches approved feature head fa03f754. [Actual release review](https://github.com/auto4496/toktickit/pull/50#pullrequestreview-5479801621).

## Fresh complete checks

All commands ran from a separate, clean detached checkout of the exact main merge. Each command's start/end times, source SHA, source state, guarded target and exit code are retained in [verification.json](../../artifacts/lab-04/final-main/verification.json). No feature-branch run was relabelled as a main run.

| Command | Observed result | Evidence |
|---|---|---|
| npm run prisma:generate | Passed; exit 0 | [output](../../artifacts/lab-04/final-main/prisma-generate-output.txt) |
| Prisma migrate deploy | All four migrations applied to fresh unit/API schema; exit 0 | [output](../../artifacts/lab-04/final-main/migration-deploy-output.txt) |
| npm test | **484 tests / 48 files passed**, 157.12s; exit 0 | [complete output](../../artifacts/lab-04/final-main/vitest-output.txt) |
| npm run test:e2e:capture:release | **32 passed**, 2.2m; exit 0; 75 selected captures | [complete output](../../artifacts/lab-04/final-main/browser-output.txt), [manifest](../../artifacts/lab-04/final-main/manifest.json) |
| npm run build:server | Passed; exit 0 | [output](../../artifacts/lab-04/final-main/build-server-output.txt) |
| npm run build:client | Passed; exit 0 | [output](../../artifacts/lab-04/final-main/build-client-output.txt) |

Unit/API and browser targets were separately named lab4_main_test_20261010 and lab4_main_e2e_test_20261010 in lab3_test at 127.0.0.1:55433, dedicated container toktickit-lab3-test. Database suites ran sequentially with NODE_PATH and DEBUG unset. Migration/recovery/scale fixtures used additional random isolated targets and cleaned those targets afterward. Builds do not use the database.

The full suite repeated real migration preservation, idempotent seed, backup/restore, complete record/constraint comparisons, attachment hashes and authenticated downloads. [Current recovery evidence](../../artifacts/lab-04/final-main/recovery.json). No required test was skipped or changed for this documentation update. No failed main runtime command is omitted: all six commands passed on their first complete run.

## Scale and capture provenance

The fresh real fixture contains 5,000 Tickets and 10,000 Actions. Requester: **40.12ms / 1,312 bytes / five recent rows / five data queries**. Staff: **31.93ms / 1,568 bytes / five recent rows / six data queries**. Metrics match independent database counts. Six natural EXPLAIN ANALYZE/BUFFERS plans are retained in [dashboard-smoke.json](../../artifacts/lab-04/final-main/dashboard-smoke.json). These are single local smoke observations, not production latency guarantees.

The capture manifest preserves actual main SHA, capture time, empty detached branch name and clean source state. Its original generic capture-tool note is retained as captureToolNote; the publication note explains the verified main checkout. All 75 selected PNG hashes and byte sizes were checked before publication. Historical author-branch evidence under release/ remains separate and unchanged.

## Report closeout

The refreshed AI-use section contains eight edited technical prompt summaries and a project-based Reflection, as requested by the student. [Model IDs](../../artifacts/lab-04/final-main/model-use.json) are verified from this LAB4 chat's metadata. No student-performed runtime tests or demonstrations are invented. Student demonstration/native zoom, final submission closeout and the final all-Issues-Done record remain in [release gates](release.md). Issue #48 was reopened after GitHub automatically closed it on the main merge.
