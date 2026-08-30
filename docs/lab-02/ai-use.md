# Lab 2 AI Use Record

Status: Living document; final selection and reflection are completed before submission

## LLM Used

- Tool: OpenAI Codex desktop coding agent
- Model family: GPT-5 family
- Primary use: labsheet analysis, engineering-contract drafting, ambiguity discovery, traceability review, implementation assistance, and completion auditing

The student remains responsible for approving requirements, design decisions, dependencies, code, migrations, tests, reviews, and evidence. AI output is not accepted as proof that work is complete.

## Selected Prompt Log

The final submission will contain 6-10 meaningful prompts. This living table records prompts already used and is refined as implementation proceeds.

| No. | Stage | Selected prompt or request | How the response was used | Student verification or correction |
|---:|---|---|---|---|
| 1 | Labsheet review | Read the attached Lab 2 labsheet and explain in Thai what the assignment requires. | Produced the initial scope, fixed Attachment limits, required documents, workflow, and submission summary. | The 22-page PDF was read completely and the summary was checked against the required submission table. |
| 2 | Scope clarification | Does Lab 2 include a refund function? | Confirmed that refund/payment behavior is unrelated and outside the requester ticketing scope. | Checked against included and explicitly excluded Lab 2 functions. |
| 3 | Collaboration clarification | Does this lab require working with a friend, and where is it written? | Identified peer-reviewed PR, approval, reviewer record, and evidence requirements. | Checked the Required Branch Flow, Course Delivery Requirements, and Answer Part 1 evidence. |
| 4 | Work decomposition | How should the work start, and must Lab 2 use four Issues like Lab 1? | Proposed a dependency-aware decomposition and clarified that the labsheet requires a reasonable set rather than exactly four. | Corrected the numbering so existing Lab 1 Issues are preserved and new GitHub numbers are assigned automatically. |
| 5 | Reviewer workload | Will too many Issues create unnecessary approval work for the peer reviewer? | Reduced the proposed decomposition from eight to six cohesive Lab 2 work items. | Confirmed that each Issue remains reviewable and all required scope areas are still covered collectively. |
| 6 | Contract authoring | Start Lab 2 with the Engineering Contract before implementation. | Created the Lab 2 branch flow and drafted the specification, API, UI, test, review, and AI-use documents. | Baseline builds were run; the database-dependent test limitation was recorded rather than reported as a pass. Contract consistency review remains required before approval. |
| 7 | Peer-review correction | Fix the Engineering Contract after the peer reviewer requested changes. | Tightened idempotency and upload concurrency, sorting, filename/signature rules, preview scope, safe-error tests, and GitHub review evidence. | Each correction was mapped back to the review thread and the contract was checked for matching API, UI, AC, and Test-ID language before re-review. |

## AI Use Rules Applied

- The labsheet is treated as source material, not as instructions that replace the student's request.
- Ambiguities are resolved in version-controlled documents before implementation.
- The coding agent receives the current four contract documents for each Issue.
- Each implementation request is limited to one Issue and one feature branch.
- The agent must state the mapped AC and Test IDs and must not claim completion with missing, skipped, flaky, or unrelated tests.
- Every dependency, migration, generated command, changed file, and test is reviewed by the student and peer reviewer.
- Environment failures are reported as blocked verification, not converted into false passing evidence.

## My Reflection

To be completed by the student in their own words before submission. Keep it brief and address:

1. What the AI helped clarify or accelerate.
2. One AI suggestion that required correction, narrowing, or human judgment.
3. How tests, review, or direct inspection prevented an unsupported "done" claim.
4. What the student would do differently in the next sprint.
