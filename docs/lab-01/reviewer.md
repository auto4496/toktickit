# Lab 1 - Peer Review Record

**Author:** Phanuwit Butchari - 67070501070 - GitHub: [@auto4496](https://github.com/auto4496)

**Peer reviewer:** Pitchai Chadchuangchot - 67070501068 - GitHub: [@Datakung](https://github.com/Datakung)

**Peer repository:** [Datakung/toktickit](https://github.com/Datakung/toktickit)

This record covers both directions of the peer review: feedback my partner gave on my Pull Requests, and feedback I gave on my partner's Pull Requests.

## Pull Requests I Authored

| Issue | Pull Request | Review result |
|---|---|---|
| Issue 1 - Project Foundation | [PR #5](https://github.com/auto4496/toktickit/pull/5) | [Approved](https://github.com/auto4496/toktickit/pull/5#pullrequestreview-4889168152) and merged |
| Issue 2 - API Health Check | [PR #6](https://github.com/auto4496/toktickit/pull/6) | [Approved](https://github.com/auto4496/toktickit/pull/6#pullrequestreview-4892219457) and merged |
| Issue 3 - Category Seed | [PR #7](https://github.com/auto4496/toktickit/pull/7) | [Approved](https://github.com/auto4496/toktickit/pull/7#pullrequestreview-4906573910) and merged |
| Issue 4 - Category List | [PR #8](https://github.com/auto4496/toktickit/pull/8) | [Approved](https://github.com/auto4496/toktickit/pull/8#pullrequestreview-4913008861) and merged |

### Feedback on My Pull Requests and My Responses

#### Issue 1

**Partner's feedback:** Move the Prisma schema and backend test into the required `server/` paths, update the README, add sanitized PostgreSQL evidence, and remove duplicate root-level copies.

**My response:** I moved and removed the files, updated the imports and documentation, added `docs/lab-01/db-evidence.md`, and reran installation, Prisma generation, tests, and both builds. My partner re-reviewed the corrected commit and approved it.

#### Issue 2

**Partner's feedback:** Recreate the branch from the latest `lab1-staging`, preserve Issue 1 files, keep the diff limited to Issue 2, and use the exact service value `TokTickIT API`. A follow-up review found that Vite did not load the repository-root `.env`.

**My response:** I rebuilt the feature from the correct base, fixed the health response and test, then configured Vite to load the root environment values and derive the proxy target from them. I reran both builds and all tests before requesting another review.

#### Issue 3

**Partner's feedback:** The model, migration, unique name, four seed values, and repeatable upsert were correct, but the documented root `.env` was not loaded by commands run from `server/`.

**My response:** I added `dotenv-cli`, changed the Prisma scripts to load `../.env`, and verified generation, migration, two seed runs, both builds, and all tests using only the root environment file.

#### Issue 4

**Partner's feedback:** The Prisma endpoint, ordering, UI states, builds, and database-independent tests met the acceptance criteria. The reviewer could not rerun the database-backed test because PostgreSQL/Docker was unavailable in their review environment, but confirmed that the test was correctly structured.

**My response:** No blocking change was requested. I had already run the complete suite with PostgreSQL available: four test files and six tests passed. The PR was approved and merged into `lab1-staging`.

## Pull Requests I Reviewed for My Partner

| Issue | Pull Request | My review result |
|---|---|---|
| Issue 1 - Project Foundation | [Datakung PR #5](https://github.com/Datakung/toktickit/pull/5) | [Approved](https://github.com/Datakung/toktickit/pull/5#pullrequestreview-4891993807) |
| Issue 2 - API Health Check | [Datakung PR #6](https://github.com/Datakung/toktickit/pull/6) | [Approved](https://github.com/Datakung/toktickit/pull/6#pullrequestreview-4892317634) |
| Issue 3 - Category Seed | [Datakung PR #7](https://github.com/Datakung/toktickit/pull/7) | [Approved](https://github.com/Datakung/toktickit/pull/7#pullrequestreview-4895042402) |
| Issue 4 - Category List | [Datakung PR #8](https://github.com/Datakung/toktickit/pull/8) | [Approved](https://github.com/Datakung/toktickit/pull/8#pullrequestreview-4905951464) |

### My Feedback and My Partner's Responses

#### Partner Issue 1

**My feedback:** I initially asked for a clean-install backend verification because my restricted environment reported a Prisma build problem.

**Partner's response:** My partner supplied Node/npm versions and confirmed that `npm ci`, `npm run build`, and `npm run dev` passed in a fresh clone. I found that my environment had disabled dependency lifecycle scripts, corrected my review, and approved the PR.

#### Partner Issue 2

**My feedback:** The feature met the acceptance criteria. I suggested changing `Relates to #2` to `Closes #2` as a non-blocking workflow improvement.

**Partner's response:** My partner explained that GitHub does not automatically close an Issue when a PR is merged into a non-default staging branch, so the Issue would be closed manually after merge. I accepted the explanation and approved the PR.

#### Partner Issue 3

**My feedback:** I checked the Category model, migration, unique index, four seed names, idempotent upsert, secrets, README, and Issue 3 scope. I found no blocking problem.

**Partner's response:** No correction was requested, so no follow-up change was needed. I approved the PR.

#### Partner Issue 4

**My feedback:** The endpoint, ordering, API test, React category list, and loading/success/error states were correct. I made one non-blocking suggestion to update two outdated README statements.

**Partner's response:** My partner updated both README statements to describe the completed health and category flow. I verified the update and approved the PR.

## Final Integration

[PR #9](https://github.com/auto4496/toktickit/pull/9) promotes the completed `lab1-staging` branch to `main`. It remains unmerged until the documentation audit and final peer review are complete.
