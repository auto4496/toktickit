# Lab 1 - AI Use and Reflection

I used OpenAI Codex in the Codex desktop application with a GPT-5 model. I used it to interpret the Lab 1 requirements, inspect code and Git history, resolve branch and configuration problems, review my peer's Pull Requests, run verification commands, and prepare documentation. I remained responsible for checking the requirements, reading the changes, running the commands, and deciding whether review findings were valid.

## Selected Key Prompts

| Prompt name | Actual prompt text | My reflection |
|---|---|---|
| Resolve the Issue 2 merge conflict | "Please guide me on how to properly resolve the merge conflicts in `client/src/App.tsx`, `client/vite.config.ts`, `server/package.json`, and `server/src/app.ts` so I can complete the PR for Issue 2." | Naming the exact branch and conflicted files made the guidance concrete. I later learned that the latest staging commit and required PR scope should also be stated at the start. |
| Review only my partner's Issue 1 | "อันนี้ให้รีวิวแค่ Issue 1 นะ" together with the partner's feature-branch ZIP. | A strict Issue boundary prevented later health, category, and UI requirements from being treated as Issue 1 blockers. |
| Recreate Issue 2 from staging | "PR #5 is merged, but PR #6 is still based on the old `b780509` commit... update/recreate `feature/2-health-check` from the latest `lab1-staging` and preserve all Issue 1 files." | Including the base commit, target branch, preserved file, and exact response value produced a safer branch repair. |
| Fix frontend environment loading | "Could you configure Vite to load the root environment file (`envDir`) or move/document the variable under `client/.env`, and avoid hard-coding port 5000 here?" | A specific configuration symptom was more useful than simply saying the page failed. The fix could then be verified with a production build and tests. |
| Review my partner's Issue 3 | "เพื่อนผมส่ง Issue 3 มาให้รีวิวละคุณช่วยหน่อยเอาละเอียดเลยนะ" together with the Issue 3 ZIP. | Asking for a detailed acceptance-criteria review helped separate model, migration, seed, secret handling, and repeatability checks from Issue 4 work. |
| Implement my Issue 3 | "เคของเพื่อนผ่านมาต่อที่ของผม" after updating `lab1-staging` and creating `feature/3-category-seed`. | Supplying the current branch and terminal output made it possible to continue without repeating completed Git steps. |
| Diagnose PostgreSQL and Docker | "`npx prisma migrate status` returns P1001: Can't reach database server at `localhost:5432`." | The exact error and Docker container output made the difference between a Prisma schema problem and a stopped or conflicting database service clear. |
| Fix Issue 3 root `.env` handling | "These migration and seed commands run with `server/` as the working directory, but the README instructs users to put `DATABASE_URL` in the repository-root `.env`... แก้ให้เลยได้ไหม" | Quoting the peer's exact review comment kept the fix focused on environment loading and supported a precise re-review response. |
| Implement and verify Issue 4 | "ช่วยทำ issue 4 ให้เสร็จเลยได้ไหมเอาแบบเรียบร้อยนะ" | Before coding, the agent checked that Issue 3 was approved and merged it into staging. The implementation then added a Prisma-backed category endpoint, API and UI tests, and loading, success, and error states without hard-coding category values in the React component. |

## Reflection

My early prompts were short and sometimes omitted the branch base, exact acceptance criterion, or execution environment. The most reliable prompts included the current branch, the intended PR target, exact file paths, the relevant Lab issue, the expected value, and complete command output. I also learned that an AI review can be wrong when its sandbox differs from a normal installation, so important findings should be reproduced in a fresh checkout or confirmed with the peer's environment before requesting changes. I improved by asking for scope-limited reviews, preserving earlier Issue files explicitly, and rerunning builds, tests, migrations, and repeatable seeds after each fix.
