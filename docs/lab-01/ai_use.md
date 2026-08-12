# Lab 1 - AI Use and Reflection

I used OpenAI Codex in the Codex desktop application with a GPT-5 model. I used it to help plan the work, troubleshoot Git and configuration problems, review code, implement features, and verify the final result. I checked the suggested changes and command output before accepting them.

## Selected Key Prompts

The prompts below are selected examples from my Lab 1 work, edited for clarity and translated into English where necessary.

| Prompt name | Actual prompt text | My reflection |
|---|---|---|
| Resolve the Issue 2 merge conflict | Inspect the conflicts between `feature/2-health-check` and `lab1-staging` in the four reported files. Preserve all completed Issue 1 work, keep only Issue 2 changes in the final diff, and give me the safe Git commands to finish the PR. | Stating what had to be preserved made the conflict resolution safer. |
| Review my partner's Issue 1 | Review the attached branch against Issue 1 only. Check the required project setup, Prisma initialization, tests, repository structure, README, `.gitignore`, and `.env.example`. Separate blocking findings from optional suggestions and do not treat Issue 2-4 features as missing. | Limiting the scope prevented unrelated features from becoming false review findings. |
| Recreate Issue 2 from staging | Recreate `feature/2-health-check` from the latest `lab1-staging` because the current PR is based on an outdated commit. Preserve all Issue 1 files, use the exact service value `TokTickIT API`, and verify that the PR diff contains only Issue 2 changes. | Including the correct base and exact response value produced a cleaner repair. |
| Fix Vite environment loading | The repository documents `VITE_API_URL` in the root `.env`, but Vite runs from `client/` and does not load it. Configure Vite to load the documented environment file and derive the development proxy target without hard-coding port 5000. Verify the client build and tests. | Describing the configuration mismatch led to a focused fix instead of changing the API code. |
| Implement the category model and seed | On `feature/3-category-seed`, add the Prisma `Category` model, migration, and an idempotent seed for the four required category names. Keep credentials out of Git, do not include Issue 4 work, and verify the migration and two consecutive seed runs. | The scope and repeatability check matched the Issue 3 acceptance criteria directly. |
| Diagnose the PostgreSQL failure | `prisma migrate status` returns P1001 for `localhost:5432`. Use the Prisma output and Docker container status to determine whether the problem is the schema, environment configuration, port mapping, or a stopped database. Do not change application code until the cause is confirmed. | Providing the exact error helped distinguish a service problem from a code problem. |
| Implement and test Issue 4 | Add a Prisma-backed `GET /api/categories` endpoint with predictable ordering and Supertest coverage. Update React to display API-provided categories with loading, Online, Offline, and useful error states. Add UI tests, then run the full test suite and both builds. | This prompt covered the complete API-to-UI vertical slice without adding work outside Issue 4. |
| Perform the final Lab 1 audit | Review the completed Lab 1 repository against every acceptance criterion and submission requirement. Check branch history, PR scope, peer-review evidence, AI-use documentation, tests, builds, database setup, README, secrets, and the final Project board. Report any remaining blocker before `lab1-staging` is merged into `main`. | A final checklist found documentation and Project-board details that normal code tests would not detect. |

## Reflection

My first prompts were often too short and depended too much on the previous conversation. I obtained better results when I included the current branch, target branch, exact Issue scope, files or values that had to be preserved, and the checks required before completion. I also learned to verify AI findings rather than accept them immediately. One review result came from a restricted environment and did not reproduce in a clean installation, so I corrected the review after checking the evidence. For the later Issues, I used clearer constraints and confirmed the work with Git diffs, tests, builds, database checks, and browser behavior.
