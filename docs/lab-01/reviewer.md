# Lab 1 - Peer Review Record

**Author:** Phanuwit Butchari - 67070501070 - GitHub: [@auto4496](https://github.com/auto4496)

**Peer reviewer:** Pitchai Chadchuangchot - 67070501068 - GitHub: [@Datakung](https://github.com/Datakung)

**Peer repository:** https://github.com/Datakung/toktickit

This record includes all four Lab 1 Issues. The authored Issue 4 implementation is verified and ready for peer review.

## Pull Requests I Authored

| Issue | Pull Request | Branch | Current verdict |
|---|---|---|---|
| Issue 1 - Project Foundation | [PR #5](https://github.com/auto4496/toktickit/pull/5) | `feature/1-project-foundation` | Approved and merged |
| Issue 2 - API Health Check | [PR #6](https://github.com/auto4496/toktickit/pull/6) | `feature/2-health-check` | Approved and merged |
| Issue 3 - Category Seed | [PR #7](https://github.com/auto4496/toktickit/pull/7) | `feature/3-category-seed` | Approved and merged |
| Issue 4 - Category List | [PR #8](https://github.com/auto4496/toktickit/pull/8) | `feature/4-category-list` | Ready for peer review |

### Issue 1 - Project Foundation

**Reviewer feedback:** The reviewer requested that the Prisma schema and backend test be moved to the required `server/prisma/` and `server/tests/lab-01/` paths, that the README be updated, and that sanitized evidence of a real PostgreSQL connection be added. A follow-up review found duplicate root-level copies of the schema and test.

**My response and correction:** I moved the files to the required server paths, updated imports and configuration, added `docs/lab-01/db-evidence.md`, removed the duplicate root-level files, and reran dependency installation, the test suite, both builds, and Prisma Client generation.

**Final approval:** [The reviewer re-reviewed commit `6e6302d` and approved the Issue 1 scope.](https://github.com/auto4496/toktickit/pull/5#pullrequestreview-4889168152)

### Issue 2 - API Health Check

**Initial reviewer feedback:** PR #6 was based on the old `b780509` commit and conflicted with the updated `lab1-staging`. The reviewer asked me to recreate the feature from the latest staging branch, preserve all Issue 1 files, keep the PR limited to Issue 2, and change `Tok TickIT API` to the exact required value `TokTickIT API`.

**My response and correction:** I recreated `feature/2-health-check` from the latest `lab1-staging`, preserved the Issue 1 files, corrected the health response and Supertest expectation, and verified both builds and the test suite.

**Follow-up reviewer feedback:** The branch and response issues were fixed, but Vite did not load the repository-root `.env`, so `VITE_API_URL` could be ignored. The reviewer requested a consistent environment-loading path. Unrestricted CORS and missing frontend tests were recorded as non-blocking suggestions.

**My response and correction:** I configured Vite with `envDir` and `loadEnv`. The development proxy now derives its target from `VITE_API_URL` or `PORT`. I reran the client build and all tests.

**Final approval:** [The reviewer re-reviewed commit `58ce1de` and approved PR #6.](https://github.com/auto4496/toktickit/pull/6#pullrequestreview-4892219457)

### Issue 3 - Category Seed

**Reviewer feedback:** The branch order, Category model, migration, unique constraint, four required names, and repeatable upsert approach were correct. However, the Prisma migration and seed commands ran from `server/` while the documented `DATABASE_URL` was in the repository-root `.env`, so the commands failed on a fresh documented setup.

**My response and correction:** I added `dotenv-cli` and changed the Prisma generate, migration, and seed scripts to load `../.env` explicitly. I removed the temporary `server/.env` copy and verified Prisma generation and migration, two consecutive seed runs, the server build, and all tests using only the root environment file. I then [requested re-review](https://github.com/auto4496/toktickit/pull/7#issuecomment-5252997073).

**Final approval:** The reviewer re-reviewed commit `040e3cc`, verified the root environment configuration, both builds, all existing tests, Category model, migration, seed values, and idempotent upsert, and approved the PR. PR #7 was then merged into `lab1-staging`.

### Issue 4 - Category List

**Implementation submitted:** [PR #8](https://github.com/auto4496/toktickit/pull/8) adds the Prisma-backed category endpoint, predictable ID ordering, Supertest coverage, API-driven React category list, loading/Online/Offline states, and Vitest UI coverage.

**Verification:** The complete Vitest suite passes with four test files and six tests. Both production builds also pass. The React test dependencies are aligned with the client version, and Vitest deduplicates React so the UI tests use a single instance.

**Current status:** Ready for peer review.

## Pull Requests I Reviewed for My Partner

### Partner Issue 1 - Project Foundation

- Pull Request: [Datakung/toktickit PR #5](https://github.com/Datakung/toktickit/pull/5)
- My initial review: I requested verification that the backend could build and start from a completely fresh installation because my restricted review environment reported a Prisma-related build problem.
- Partner response: The partner tested a fresh clone with Node v24.14.0 and npm 11.9.0. `npm ci`, `npm run build`, and `npm run dev` succeeded; HTTP 501 was confirmed as the intentional Issue 2 stub.
- My follow-up: I found that disabled dependency lifecycle scripts in my review environment had caused a non-representative result. I documented the correction and [approved the PR](https://github.com/Datakung/toktickit/pull/5#pullrequestreview-4891993807).

### Partner Issue 2 - API Health Check

- Pull Request: [Datakung/toktickit PR #6](https://github.com/Datakung/toktickit/pull/6)
- My review: I verified the exact health JSON, HTTP 200, Supertest coverage, real frontend API call, loading/online/offline states, configuration consistency, and clean mergeability. I approved the PR and suggested changing `Relates to #2` to `Closes #2` as a non-blocking workflow improvement.
- Partner response: The partner explained that GitHub does not apply closing keywords when the PR merges into a non-default staging branch, so Issue 2 would be closed manually after merge.
- Outcome: [Approved and merged.](https://github.com/Datakung/toktickit/pull/6#pullrequestreview-4892317634)

### Partner Issue 3 - Category Seed

- Pull Request: [Datakung/toktickit PR #7](https://github.com/Datakung/toktickit/pull/7)
- My review: I verified the required Category fields, migration SQL, unique name index, exactly four seed names, idempotent upsert, secret handling, README consistency, and separation from Issue 4.
- Outcome: I found no blocking issue and [approved the PR](https://github.com/Datakung/toktickit/pull/7#pullrequestreview-4895042402); it was later merged into the partner's `lab1-staging` branch.

### Partner Issue 4 - Category List

- Pull Request: [Datakung/toktickit PR #8](https://github.com/Datakung/toktickit/pull/8)
- My review: I verified the Prisma-backed category endpoint, ascending ID order, Supertest coverage, API-driven React list, and tested loading, success, and useful failure states. I found no blocking issues and approved the PR.
- Non-blocking suggestion: I asked the partner to update two outdated README statements that still described the category API as deferred.
- Partner response: The partner updated both statements so the README documents the completed health-and-category flow and implemented Prisma endpoint.
- Outcome: [Approved and merged.](https://github.com/Datakung/toktickit/pull/8#pullrequestreview-4905951464)
