
# Lab 1 - Peer Review Record

**Author:** Phanuwit Butchari - 67070501070 - GitHub: @auto4496
**Peer reviewer:** Pitchai Chadchuangchot - 67070501068 - GitHub: @Datakung
**Peer repository:** https://github.com/Datakung/toktickit

## Pull Requests I authored

| Issue | Pull Request | Branch | Reviewer verdict |
|---|---|---|---|
| Issue 1 - Project Foundation | [PR #5](https://github.com/auto4496/toktickit/pull/5) | `feature/1-project-foundation` | Approved and merged |
| Issue 2 - API Health Check | [PR #6](https://github.com/auto4496/toktickit/pull/6) | `feature/2-health-check` | Approved and merged |
| Issue 3 - Category Seed | TODO | `feature/3-category-seed` | Pending |
| Issue 4 - Category List | TODO | `feature/4-category-list` | Pending |

## Issue 2 review evidence

**Initial reviewer feedback:**

> PR #5 is merged, but PR #6 is still based on the old b780509 commit and conflicts with the updated lab1-staging. Recreate feature/2-health-check from the latest lab1-staging, preserve all Issue 1 files including docs/lab-01/db-evidence.md, and keep only Issue 2 changes in the PR. Change the health response and Supertest expectation from "Tok TickIT API" to the exact required value "TokTickIT API".

**My response and correction:**

> I recreated feature/2-health-check from the latest lab1-staging, preserved the Issue 1 files, limited the PR diff to Issue 2, corrected the response and test expectation to "TokTickIT API", and requested another review.

**Follow-up reviewer feedback:**

> The branch ordering and health-response issue are fixed, and the PR contains only Issue 2 changes. VITE_API_URL is documented in the repository-root .env, but Vite runs from client/ and does not load that file by default. Configure Vite to load the root environment or move and document the variable under client/.env. Unrestricted CORS and missing frontend tests are non-blocking suggestions.

**My response and correction:**

> I configured Vite to load the repository-root environment through envDir and loadEnv. The proxy now derives its target from VITE_API_URL or PORT. I reran the client production build and the complete test suite successfully.

**Final approval:**

> Re-reviewed commit 58ce1de. The VITE_API_URL configuration issue is fixed: Vite now loads the root environment file and derives the development proxy target from the configured API URL or port. I verified the client and server builds, the production environment value, and all tests. Approved.

## Pull Requests I reviewed for my partner

### Partner Issue 1 - Project Foundation

- Pull Request: https://github.com/Datakung/toktickit/pull/5
- Initial review: I requested verification that the backend could build and start from a completely fresh installation.
- Partner response: The partner tested a fresh clone with Node v24.14.0 and npm 11.9.0. `npm ci`, `npm run build`, and `npm run dev` succeeded, and the HTTP 501 response was confirmed as the intentional Issue 2 stub.
- My follow-up: I identified that my restricted review environment had disabled dependency lifecycle scripts, accepted the fresh-clone evidence, and approved the Pull Request.

### Partner Issue 3 - Category Seed

- Pull Request: https://github.com/Datakung/toktickit/pull/7
- My review: I verified the Category model, migration SQL, unique category name constraint, repeatable upsert seed, required category names, secret handling, and separation from Issue 4.
- Final outcome: The implementation met the Issue 3 acceptance criteria with no blocking defects, so I approved the Pull Request.

## Remaining review records

- Add authored PR links, received comments, responses, and approvals for Issues 3 and 4.
- Add further partner PR reviews if completed.
