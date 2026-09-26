# Lab 3 AI Use Record

Status: Living record with nine real selected prompts, implementation/review history and a user-requested Reflection draft. Continue recording meaningful experience without fabricating prompts or completed verification.

## Tool and role

OpenAI Codex desktop agent, GPT-6 (session-provided model identity; exact service variant not independently recorded). Used for reading the Lab 3 PDF, explaining scope in Thai, inspecting the Lab 2 architecture, planning Issues, drafting the contract, implementing and testing features, addressing actual peer findings and preparing verification evidence. Independent approval belongs to the reviewer; see reviewer.md.

The handout is source material distinct from the user's request. User chose to begin the six-Issue plan and explicitly emphasized polished UI consistent with the assignment. The agent isolated work from existing uncommitted Lab 2 report edits and based the new contract on completed remote main.

## Selected real prompt log

| No. | User request (original Thai) | Use / result so far |
|---|---|---|
| 1 | lab 3 มาแล้วอธิบายแล้วก็วางแผนที | Read 18-page handout and inspected mockups; explained scope/rules/deliverables and compared with existing Requester model/header context. |
| 2 | แล้วควรมีกี่ Issue | Proposed a dependency-aware 10-Issue decomposition; treated count as a proposal, not a handout requirement. |
| 3 | สามารถลดได้เหมือนเพราะต้องมารอเพื่อน Approve อีก | Consolidated to six Issues including release, with feature tests inside each and retained peer review. |
| 4 | ตอนนี้สามารถเริ่มเลยได้ไหม | Began the contract work item, checked GitHub/main, created isolated branch/worktree and drafted seven linked planning/evidence documents. |
| 5 | ขอ UI สวยๆ และให้ตรงโจทย์นะ | Strengthened UI contract with concrete dimensions/hierarchy, queue table/mobile cards, separate private/public composers, narrow Admin UI and visual checklist. |
| 6 | แก้เลยแล้วผมต้องรีวิวของเพื่อนควรแยกแชทไหม | Addressed Datakung's 2026-09-12 board/document mismatch review: return #26 to Backlog, correct #25 workflow and review records, preserve the separate local authentication draft, and prepare the correction for re-review. Recommended a separate conversation for reviewing the partner's repository. |
| 7 | เพื่อนส่งแก้มาแล้ว | Read the actual peer findings, fixed dirty navigation loss and ambiguous browser assertions, and added regression coverage. |
| 8 | ใส่ให้ผมเลยได้ไหม | Drafted the Reflection below using recorded project events, explicitly retaining student review before submission. |
| 9 | ทำ issue ต่อเลย | Continued #29 with integrated checks, responsive/error-state evidence, real API failure/rollback coverage and a nine-part submission draft. |

## Verification and limitations

Issue #29 update (2026-09-25): Codex added four cross-role browser journeys and six real HTTP/database failure cases, retained the original regressions, and captured 109 images after all 17 browser journeys passed. Keyboard verification exposed a confirmation focus-cycle defect; it was corrected and rechecked in a real browser. Final full Vitest verification passed 389 cases across 36 files on a fresh isolated database. Earlier selector, test-stub and environment failures are recorded in system-verification.md. These are agent verification results, not the student's personal test execution or peer approval.

Selected implementation prompt: “ทำ 3 ต่อเลย”, followed by “ทำต่อเลย” after interruption. Codex implemented the Issue #27 queue/operations/conversation and Requester indication, then used real PostgreSQL/API/UI/browser tests to verify them. Testing caught a PostgreSQL advisory-lock result decoding defect; it was corrected to execute the lock without decoding its void result. Two browser test selectors were refined when the new UI added owner options and nested select labels. Original tests were retained and the failures are recorded in tests.md. The agent's observations are not the student's personal reflection.

Compare the four contract documents and test mapping before handoff. Planned tests and screenshots remain Planned. Record actual checks in reviewer.md/tests.md after execution. Technical security decisions reference primary Node/OWASP sources in specification.md. A contract self-check is not an independent peer review.

## My Reflection

Peer-fix update (2026-09-21): the user said “เพื่อนส่งแก้มาแล้ว”. Codex read Datakung's two inline findings on PR #34, reproduced dirty navigation loss with five failing App-level regressions, implemented the navigation guard, and scoped browser success assertions to their actual text. The correction preserves mandatory authentication redirects. Results are recorded separately from the original implementation and the reviewer's independent run; no first-person student reflection or peer approval is inferred.

Issue #28 continuation (2026-09-20): the user asked “จัดการต่อเลย”. Codex continued the administrator API/UI on an isolated branch based on the approved PR #33 merge, wrote concurrency and UI/browser tests, and checked real responsive screenshots. The first browser run identified missing opener focus after dismissing the reset dialog; the implementation was corrected rather than weakening the assertion. Docker startup was recovered by preserving stale socket-only runtime directories; no factory reset or development-data migration was performed. Actual execution results belong in tests.md, not a claimed student reflection or peer review.

Implementation update: after actual contract approval/merge, the user requested “เริ่มทำต่อเลย”. Codex implemented the #26 schema/session/authentication/UI increment, migrated old tests to session identity, ran real PostgreSQL migration/regression tests and browser tests, and inspected selected screenshots. Initial failing tests and the interrupted browser run are retained in tests.md rather than presented as passes. The user's later “ถึงไหนแล้ว” prompted a factual progress report. This work does not constitute peer approval or the student's own reflection.

### ร่าง Reflection สำหรับ Answer Part 4

ร่างโดย Codex ตามคำขอของผู้ใช้ “ใส่ให้ผมเลยได้ไหม” เมื่อ 2026-09-25 โดยอิงจากเหตุการณ์ที่บันทึกไว้ในโครงการ ผู้ใช้ยังต้องอ่านและปรับข้อความให้ตรงกับประสบการณ์และความเข้าใจของตนก่อนส่ง ร่างนี้ไม่ใช่หลักฐานว่าผู้ใช้ได้ตรวจโค้ดหรือทดสอบด้วยตนเองแล้ว

การทำ Lab 3 แสดงให้เห็นว่าการพัฒนาระบบไม่ได้จบแค่หน้าเว็บแสดงผลได้ แต่ต้องมีข้อกำหนด สิทธิ์ของผู้ใช้ และหลักฐานการทดสอบที่สอดคล้องกัน เช่น Requester ควรเข้าถึงเฉพาะงานของตนเองและข้อความสาธารณะ ส่วน IT Staff และ Administrator มีหน้าที่และสิทธิ์ต่างกัน การซ่อนปุ่มในหน้าเว็บอย่างเดียวจึงไม่เพียงพอ ต้องตรวจสิทธิ์ที่ API ด้วย

AI ช่วยอ่านและสรุปโจทย์ วางแผน Issues ร่าง specification และช่วยพัฒนาโค้ด ชุดทดสอบ และเอกสารตามขอบเขตของแต่ละงาน การจัดงานเป็น 6 Issues ทำให้รวมการพัฒนากับการทดสอบของแต่ละส่วนไว้ด้วยกัน และยังคงให้เพื่อนรีวิวก่อนรวมโค้ด อย่างไรก็ตาม โค้ดและเอกสารที่ AI สร้างยังต้องตรวจเทียบกับโจทย์และผลการทำงานจริง ไม่ควรถือว่าถูกต้องเพียงเพราะ AI รายงานว่าทำเสร็จ

ตัวอย่างที่ชัดเจนคือการรีวิว PR #34 เพื่อนพบว่าการออกจากหน้าจัดการผู้ใช้ขณะมีข้อมูลที่ยังไม่ได้บันทึกอาจทำให้ข้อมูลในฟอร์มหาย จึงมีการเพิ่มการยืนยันก่อนออกจากหน้าผ่านเมนูและปุ่ม Back/Forward พร้อมเพิ่ม regression tests อีกประเด็นคือ browser test ตรวจข้อความสถานะกว้างเกินไป จึงแก้ให้ตรวจข้อความสำเร็จของการทำงานนั้นโดยตรง เหตุการณ์นี้แสดงให้เห็นว่าการรีวิวช่วยพบทั้งปัญหาของระบบและจุดอ่อนของชุดทดสอบได้

ประเด็นที่ควรนำไปใช้ต่อคือการเริ่มจากข้อกำหนดที่ตรวจสอบได้ ทดสอบทั้งกรณีสำเร็จและกรณีผิดพลาด และบันทึกผลตามที่เกิดขึ้นจริง โดยแยกงานที่ทำแล้ว งานที่ผ่านการทดสอบ และงานที่เพื่อนอนุมัติออกจากกัน ผู้ส่งงานยังต้องอธิบายเหตุผลของการออกแบบ ตรวจความถูกต้องของรายงาน และรับผิดชอบผลงานที่ส่ง แม้จะมี AI ช่วยเขียนโค้ดและเอกสารก็ตาม
