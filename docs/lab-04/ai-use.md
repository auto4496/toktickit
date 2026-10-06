# Lab 4 AI Use

Model used: record the exact model names from the Codex UI at final submission; the user changed model during this work, so a single inferred name would be inaccurate.

## Selected prompts and outcomes

1. User: “เริ่มอันนี้เลยอันนี้ LAB4” with `SE+Lab+4.pdf`. Outcome: inspected the 11-page brief and located the integrated Lab 3 baseline.
2. User: “ผมเปลี่ยนโมเดลนะ”. Outcome: continued the same Lab 4 work on the existing branch.
3. User: “จัดการเลย” after discussing the first Issue and PR. Outcome: created Issue #38 and the documentation-only PR #39 into `codex/lab4-staging`; Datakung subsequently approved and merged the corrected contract.
4. User: “เพื่อนตรวจยัง”. Outcome: read Datakung's actual changes-requested review, added the planned migration-recovery and Start-control coverage, formally linked Issue/PR through Development, and corrected the Project status. These were contract corrections; test execution was still pending at that point.
5. User: “ส่งไปบอกยัง”. Outcome: posted the four-correction reply in PR #39 and requested Datakung's re-review.
6. User: “เหมือนจะอนุมัติแล้วนะ”. Outcome: verified actual approval of `4886585` and merge into staging by Datakung.
7. User: “จัดการเลย” after contract approval. Outcome: closed Issue #38/marked Done, created Issue #40 and isolated its additive data migration, seed and recovery checks from later API/UI work. Implemented INT-02 with a real database backup/restore and authenticated download. Fixed a test schema-selection mismatch found by Prisma diff; the corrected comparison and recovery passed. The first unavailable-Docker run was a failure, not evidence of acceptance.
8. User: “ทำต่อเลย” after the status check confirmed Datakung approved/merged #41 and Issue #40 was closed/Done. Outcome: created Issue #42 from the reviewed staging state, implemented Actions API/UI and the focused Start suite, preserved existing Owner/status permissions through a separate assignee endpoint, and corrected missing Starting/history/conflict/focus behavior. Five browser checks and both builds passed; refreshed three-width screenshots after fixing linked dependency font serving. Extended the same-Ticket journey to two IT Staff plus Admin and recorded final runs in actions.md. Independent Actions approval remains pending.

Add 4–8 further actual prompts and concrete results as the implementation and review proceed. Do not invent prompts or claim unobserved tests.

## My Reflection

Pending student reflection. Describe how the specification-agent pass resolved open design choices and how the coding-agent pass implemented and tested them; include a specific correction or limitation observed during review.
