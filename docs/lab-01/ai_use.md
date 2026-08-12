# Lab 1 - AI Use and Reflection

I used OpenAI Codex in the Codex desktop application with a GPT-5 model. I used it to read the Lab 1 requirements, troubleshoot Git and configuration problems, review code, run checks, and help organize the documentation. I still checked the commands and changes myself before deciding what to keep.

## Selected Key Prompts

These are selected examples from the work, not a complete chat transcript.

| Prompt name | Actual prompt text | My reflection |
|---|---|---|
| Resolve the Issue 2 conflict | "Please guide me on how to properly resolve the merge conflicts in `client/src/App.tsx`, `client/vite.config.ts`, `server/package.json`, and `server/src/app.ts` so I can complete the PR for Issue 2." | Listing the conflicted files helped, but the prompt would have been better if I had also included the latest staging commit and the exact Issue 2 scope. |
| Limit a peer review to one Issue | "อันนี้ให้รีวิวแค่ Issue 1 นะ" together with my partner's Issue 1 ZIP file. | This kept later health-check and category work out of the Issue 1 review. I learned to state the review boundary clearly. |
| Rebuild Issue 2 from the correct base | "PR #5 is merged, but PR #6 is still based on the old `b780509` commit... Please update/recreate `feature/2-health-check` from the latest `lab1-staging` and preserve all Issue 1 files." | The commit, branch, and files to preserve made this much safer than asking only to fix a conflict. |
| Diagnose the database connection | "`npx prisma migrate status` returns P1001: Can't reach database server at `localhost:5432`." I also included the Docker command output. | The exact error showed that Prisma could read the schema but PostgreSQL was not reachable. This avoided changing code for a service problem. |
| Fix root environment loading | "These migration and seed commands run with `server/` as the working directory, but the README instructs users to put `DATABASE_URL` in the repository-root `.env`... แก้ให้เลยได้ไหม" | Quoting the review comment kept the correction focused. I then checked generation, migration, two seed runs, builds, and tests. |
| Review my partner's Issue 3 | "เพื่อนผมส่ง Issue 3 มาให้รีวิวละคุณช่วยหน่อยเอาละเอียดเลยนะ" together with the Issue 3 ZIP file. | The first prompt was still broad. The review became more useful after checking each acceptance criterion separately: model, migration, unique name, seed values, secrets, and repeatability. |
| Implement and verify Issue 4 | "ช่วยทำ issue 4 ให้เสร็จเลยได้ไหมเอาแบบเรียบร้อยนะ" | This short prompt only worked because the branch history and Lab sheet were already in the conversation. A better standalone prompt would include the endpoint, UI states, test requirements, and target branch. |
| Debug the React UI tests | I supplied the complete `npm test` output containing "A React Element from an older version of React was rendered" and later "Cannot read properties of null (reading 'useState')". | The full output revealed two separate causes: mismatched React versions and two React instances. After both were fixed, all four test files and six tests passed. |

## Reflection

At the beginning I often used short prompts because the previous context was already in the chat. That was convenient, but it made the request less clear when branch state or Issue scope changed. My better prompts included the current branch, PR target, exact error, relevant files, expected result, and command output. I also learned not to accept every AI finding immediately. One early peer-review finding came from a restricted environment and did not reproduce in a clean installation, so I corrected the review instead of asking my partner to change working code. The most useful habit was to verify each suggested change with the Lab acceptance criteria, tests, builds, and database checks.
