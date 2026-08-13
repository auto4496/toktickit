# Lab 1 - Peer Review Record

## Participants

| Role | Name | Student ID | GitHub |
|---|---|---|---|
| Author | Phanuwit Butchari | 67070501070 | [@auto4496](https://github.com/auto4496) |
| Peer reviewer | Pitchai Chadchuangchot | 67070501068 | [@Datakung](https://github.com/Datakung) |

**Peer repository:** [Datakung/toktickit](https://github.com/Datakung/toktickit)

The same peer-review process was completed in both directions. My partner reviewed my four feature Pull Requests, and I reviewed my partner's four feature Pull Requests. The records below summarize the feedback, response, correction, and final outcome.

## Pull Requests Authored by Me

| Issue | Pull Request | Branch | Final outcome |
|---|---|---|---|
| Issue 1 - Project Foundation | [PR #5](https://github.com/auto4496/toktickit/pull/5) | `feature/1-project-foundation` | [Approved](https://github.com/auto4496/toktickit/pull/5#pullrequestreview-4889168152) and merged |
| Issue 2 - API Health Check | [PR #6](https://github.com/auto4496/toktickit/pull/6) | `feature/2-health-check` | [Approved](https://github.com/auto4496/toktickit/pull/6#pullrequestreview-4892219457) and merged |
| Issue 3 - Category Seed | [PR #7](https://github.com/auto4496/toktickit/pull/7) | `feature/3-category-seed` | [Approved](https://github.com/auto4496/toktickit/pull/7#pullrequestreview-4906573910) and merged |
| Issue 4 - Category List | [PR #8](https://github.com/auto4496/toktickit/pull/8) | `feature/4-category-list` | [Approved](https://github.com/auto4496/toktickit/pull/8#pullrequestreview-4913008861) and merged |

### Issue 1 - Project Foundation

**Review feedback:** My partner found that the Prisma schema and backend test were not in the required `server/` paths. The README and PostgreSQL evidence also needed improvement, and a follow-up review found duplicate root-level copies of the moved files.

**My response:** I moved the schema and test to the required locations, updated the imports and documentation, added sanitized database evidence in `docs/lab-01/db-evidence.md`, and removed the duplicates. I then reran dependency installation, Prisma generation, the test suite, and both builds.

**Outcome:** My partner re-reviewed commit `6e6302d` and approved the corrected Issue 1 scope.

### Issue 2 - API Health Check

**Review feedback:** PR #6 was based on an outdated commit and conflicted with the latest `lab1-staging`. My partner requested a clean Issue 2 branch that preserved Issue 1 files and used the exact value `TokTickIT API`. In a later review, my partner found that Vite did not load the documented repository-root `.env`, so changing `VITE_API_URL` would not affect the development proxy.

**My response:** I recreated the branch from the latest staging commit, preserved the earlier work, corrected the response and Supertest expectation, and limited the diff to Issue 2. I then configured Vite to load the root environment file and derive the proxy target from the configured URL or port. Both builds and all tests were rerun before re-review.

**Outcome:** My partner re-reviewed commit `58ce1de` and approved the PR.

### Issue 3 - Category Seed

**Review feedback:** The Category model, migration, unique constraint, seed names, and upsert approach were correct. However, the Prisma scripts ran from `server/` while the README placed `DATABASE_URL` in the repository-root `.env`, causing the documented fresh-setup commands to fail.

**My response:** I added `dotenv-cli` and updated the Prisma scripts to load `../.env` explicitly. I verified Prisma generation, migration status, two consecutive seed runs, four rows with four distinct names, both builds, and all tests using only the root environment file.

**Outcome:** My partner re-reviewed commit `040e3cc` and approved the PR.

### Issue 4 - Category List

**Review feedback:** My partner confirmed that the Prisma-backed endpoint, predictable ordering, API-driven React list, loading and error states, builds, and database-independent tests satisfied the acceptance criteria. PostgreSQL/Docker was unavailable in the review environment, so the reviewer inspected the database-backed Supertest structure but could not rerun that single test.

**My response:** No blocking correction was requested. I supplied the complete local result from an environment with PostgreSQL available: four test files and six tests passed, including the database-backed category endpoint test.

**Outcome:** My partner approved commit `a7357bf`, and PR #8 was merged into `lab1-staging`.

## Pull Requests I Reviewed for My Partner

| Issue | Pull Request | Final outcome |
|---|---|---|
| Issue 1 - Project Foundation | [Datakung PR #5](https://github.com/Datakung/toktickit/pull/5) | [Approved](https://github.com/Datakung/toktickit/pull/5#pullrequestreview-4891993807) |
| Issue 2 - API Health Check | [Datakung PR #6](https://github.com/Datakung/toktickit/pull/6) | [Approved](https://github.com/Datakung/toktickit/pull/6#pullrequestreview-4892317634) |
| Issue 3 - Category Seed | [Datakung PR #7](https://github.com/Datakung/toktickit/pull/7) | [Approved](https://github.com/Datakung/toktickit/pull/7#pullrequestreview-4895042402) |
| Issue 4 - Category List | [Datakung PR #8](https://github.com/Datakung/toktickit/pull/8) | [Approved](https://github.com/Datakung/toktickit/pull/8#pullrequestreview-4905951464) |

### Partner Issue 1 - Project Foundation

**My feedback:** I initially requested proof that the backend could build and start from a completely fresh installation because my restricted review environment reported a Prisma-related failure.

**Partner's response:** My partner supplied Node.js and npm versions and confirmed that `npm ci`, `npm run build`, and `npm run dev` all passed in a fresh clone. They also confirmed the expected Issue 2 stub response.

**Outcome:** I traced my result to disabled dependency lifecycle scripts in the review environment, corrected my earlier conclusion, and approved the PR. This showed why a review finding should be reproducible before it becomes a blocking request.

### Partner Issue 2 - API Health Check

**My feedback:** I verified the exact health JSON, HTTP 200 response, Supertest coverage, real frontend request, loading/online/offline behavior, configuration, and clean mergeability. I approved the implementation and suggested changing `Relates to #2` to `Closes #2` as a non-blocking workflow improvement.

**Partner's response:** My partner explained that GitHub does not apply closing keywords when a PR is merged into a non-default staging branch, so the Issue would be closed manually after merge.

**Outcome:** The explanation was valid for this workflow. I kept the suggestion non-blocking and approved the PR.

### Partner Issue 3 - Category Seed

**My feedback:** I checked the Category fields, migration SQL, unique index, four required names, idempotent upsert, secret handling, README consistency, branch order, and separation from Issue 4. I found no blocking issue.

**Partner's response:** No correction was requested, so no follow-up change was required.

**Outcome:** I approved the PR, and it was later merged into the partner's `lab1-staging` branch.

### Partner Issue 4 - Category List

**My feedback:** I verified the Prisma-backed endpoint, ascending ID order, Supertest coverage, API-driven React list, and loading, success, and useful failure states. The implementation passed review. I added one non-blocking documentation suggestion because two README statements still described the category feature as deferred.

**Partner's response:** My partner updated both README statements to describe the completed health-and-category flow and implemented Prisma endpoint.

**Outcome:** I verified the documentation update, approved the PR, and it was later merged.

## Final Integration

[PR #9](https://github.com/auto4496/toktickit/pull/9) promoted the completed `lab1-staging` branch to `main` after the documentation audit and final peer review were complete. It was merged at commit `cd2e787`. The final `main` verification passed all six tests, both production builds, Prisma schema and migration checks, two consecutive seed runs, and the four-row/four-distinct-name database check.
