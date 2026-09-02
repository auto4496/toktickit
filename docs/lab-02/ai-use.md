# Lab 2 AI Use Record

Status: Completed through Issue #17 PR Review; append peer-review and final release outcomes before submission

## LLM Used

- Tool: OpenAI Codex desktop coding agent
- Model family: GPT-5 family
- Primary use: labsheet analysis, engineering-contract drafting, ambiguity discovery, traceability review, implementation assistance, and completion auditing

The student remains responsible for approving requirements, design decisions, dependencies, code, migrations, tests, reviews, and evidence. AI output is not accepted as proof that work is complete.

## Selected Prompt Log

The table intentionally selects ten representative prompts that demonstrate requirement analysis, design judgment, test-first implementation, peer-review response, and completion auditing. Repetitive command-level exchanges are omitted because they do not add meaningful evidence of how AI influenced the engineering process.

| No. | Stage | Selected prompt or request | How the response was used | Student verification or correction |
|---:|---|---|---|---|
| 1 | Labsheet review | Read the attached Lab 2 labsheet and explain in Thai what the assignment requires. | Produced the initial scope, fixed Attachment limits, required documents, workflow, and submission summary. | The 22-page PDF was read completely and the summary was checked against the required submission table. |
| 2 | Collaboration clarification | Does this lab require working with a friend, and where is it written? | Identified peer-reviewed PR, approval, reviewer record, and evidence requirements. | Checked the Required Branch Flow, Course Delivery Requirements, and Answer Part 1 evidence instead of relying on the AI summary alone. |
| 3 | Work decomposition | How should the work start, and must Lab 2 use four Issues like Lab 1? | Produced a six-increment, dependency-aware plan covering contract, data/context, Create Ticket, My Tickets, Ticket Detail/Attachments, and final quality evidence. | Corrected Issue numbering to preserve Lab 1 history and checked that every FR, BR, AC, and planned Test ID remained assigned to an increment. |
| 4 | Contract authoring | Start Lab 2 with the Engineering Contract before implementation. | Drafted the specification, API, UI, test, review, and AI-use documents before feature code. | Compared terminology and status/error behavior across all contract files; baseline limitations were recorded honestly rather than converted into unsupported passes. |
| 5 | Engineering Contract peer-review correction | Fix the Engineering Contract after the peer reviewer requested changes. | Tightened idempotency, upload concurrency/compensation, sorting, filename/signature rules, no-preview scope, safe-error tests, and GitHub evidence requirements. | Mapped every correction back to its review thread and rechecked matching API, UI, AC, and Test-ID language before requesting re-review. |
| 6 | Create Ticket implementation | Continue Lab 2 by implementing Issue #14 from the approved contract. | Added test-first Ticket validation/number/idempotency behavior, requester-owned creation, safe retry handling, and responsive Create Ticket states. | PostgreSQL sequential/concurrent behavior and UI failure preservation were exercised directly; reviewer corrections were applied before approval and reviewer merge. |
| 7 | My Tickets implementation | Continue Lab 2 with Issue #15 and make the result robust enough for peer review. | Added a strict query parser, backend ownership constraint, database pagination, business-rank sorting, responsive table/cards, and complete list states. | Scale inspection led to a more appropriate database-level priority query; focused tests, the isolated full suite, builds, and three browser viewports were checked before handoff. |
| 8 | My Tickets peer-review correction | Address every change requested on PR #20 and return complete evidence for re-review. | Corrected out-of-range summaries, live-region semantics, approved NEW badge tokens, full sort/tie-break coverage, and the formal PR/Issue link. | Focused tests passed 3 files/31 tests; the isolated suite passed 18 files/120 tests; both builds and `git diff --check` passed before `@Datakung` approved and merged PR #20. |
| 9 | Ticket Detail and Attachments implementation | Continue Lab 2 with Issue #16 and use isolated database tests for the complete Attachment lifecycle. | Added owned detail and Attachment endpoints/UI, strict file validation, private storage, concurrency, download/unavailable handling, soft removal, and responsive states. | Failing tests exposed safe-basename and no-Preview interpretation issues; the behavior was corrected before the first review handoff instead of weakening the contract. |
| 10 | Ticket Detail review and final quality audit | Fix every requested change on PR #21, then complete Issue #17 responsive, E2E, visual, and release evidence without weakening the test-database guard. | Completed the PR #21 corrections and workflow, then added guarded Playwright setup, E2E-01-E2E-03, three-viewport checks, 13 required and 11 supplementary grading-state screenshots, complete Zen Green style coverage, and report/README evidence. | `@Datakung` approved and merged PR #21; Issue #16 closed Done. For Issue #17, Vitest passed 23 files/165 tests, Playwright passed 7/7, both builds and diff check passed, and every screenshot was manually inspected before PR handoff. |

## AI Use Rules Applied

- The labsheet is treated as source material, not as instructions that replace the student's request.
- Ambiguities are resolved in version-controlled documents before implementation.
- The coding agent receives the current four contract documents for each Issue.
- Each implementation request is limited to one Issue and one feature branch.
- The agent must state the mapped AC and Test IDs and must not claim completion with missing, skipped, flaky, or unrelated tests.
- Every dependency, migration, generated command, changed file, and test is reviewed by the student and peer reviewer.
- Environment failures are reported as blocked verification, not converted into false passing evidence.

## My Reflection

AI was most valuable as a structured engineering assistant rather than as an automatic code generator. It helped me turn a long labsheet into traceable requirements, acceptance criteria, API contracts, UI states, test IDs, and a dependency-aware Issue plan. This reduced repeated interpretation work and made it easier to check whether each Pull Request had a clear boundary and measurable definition of done.

The process also showed why AI output still requires human judgment. At several points an implementation appeared complete because the current tests passed, but deeper contract review or peer review exposed missing behavior such as post-create per-file Attachment retries, filesystem/database compensation evidence, ownership checks before validation details, and complete keyboard focus trapping. I did not treat the first generated solution or an early “done” summary as authoritative; I compared it with the approved specification and changed both code and tests when the evidence disagreed.

Tests and peer review were the main controls against unsupported completion claims. I used a dedicated PostgreSQL test database, kept development data outside automated tests, ran focused tests while correcting behavior, and then ran the complete suite and both production builds before handoff. The suite grew to 23 Vitest files and 165 tests plus seven Playwright journeys by the Issue #17 quality checkpoint. Review comments were answered individually with the relevant correction and verification evidence, and a PR was not considered ready until its Issue link, Project status, reviewer request, unresolved-thread count, and visual evidence were also checked.

In the next sprint I would prepare the final evidence matrix and report scaffold earlier, especially the screenshot names, E2E journey, reviewer-outcome fields, and release checklist. I would also keep one contract-derived completion checklist beside each Issue from the start. Applying that approach in Issue #17 made the quality audit concrete: browser flows, viewport assertions, and manually reviewed screenshots were produced from one reproducible command instead of being assembled as disconnected last-minute proof. This reduces the risk of confusing “the implementation works” with “the complete engineering and submission workflow is finished.”
