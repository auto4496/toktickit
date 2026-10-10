# Lab 4 AI Use with Reflection

## LLM and working roles

Tool: OpenAI Codex desktop. Recorded model IDs: **gpt-6-sol**, followed by **gpt-6.1-sol**, verified from this chat's model metadata. [Model-use provenance](../../artifacts/lab-04/final-main/model-use.json).

The same agent was used in two working roles. The **specification-agent role** clarified requirements, business rules, acceptance criteria and test mappings before implementation. The **coding-agent role** implemented the approved contract, investigated failures and prepared reproducible evidence. Independent approval and integration were performed by Datakung through the recorded pull requests.

## Eight selected technical prompts and outcomes

The prompts below are edited summaries of technical tasks and their context, consolidated for this report. They are not verbatim chat quotations. Outcomes describe recorded project work; they do not attribute the agent's test execution to the student.

### 1. Requirements and acceptance criteria - specification agent

Analyze the LAB4 brief against the existing Lab 3 system. Define numbered requirements, business rules and acceptance criteria for Actions Taken, Ticket transitions and role dashboards. Resolve ambiguous status, ownership and calculation rules explicitly. Preserve Lab 1-3 behavior and map each acceptance criterion to a verification method.

**Outcome:** The engineering contract was committed before feature completion in PR #39. Peer feedback added explicit Start-control and migration-recovery coverage. See [specification](specification.md) and [test traceability](tests.md).

### 2. Incremental delivery and review gates - specification agent

Organize LAB4 into six dependency-ordered work items with clear boundaries and acceptance evidence. Integrate each feature through independent review into staging, then review staging into main. Distinguish implementation, author verification, peer approval and post-merge acceptance when reporting progress.

**Outcome:** Issues #38/40/42/44/46/48 and PRs #39/41/43/45/47/49 followed this sequence. PR #50 integrated reviewed staging into main. See [work items](issue-plan.md) and [review record](reviewer.md).

### 3. Additive migration and recoverability - coding agent

Implement Action and revision storage without losing existing Tickets, identities, relationships or attachments. Make seed execution repeatable and preserve edited records. Test migration against a historical fixture, then verify real backup/restore after a controlled failure using isolated targets and authenticated attachment downloads.

**Outcome:** PR #41 added the data foundation. Integration tests compare records, constraints and attachment hashes; recovery uses actual pg_dump/pg_restore. See [data foundation](data-foundation.md).

### 4. Action lifecycle, accountability and safe retries - coding agent

Implement Action creation, assignment, Start, edit, completion and cancellation. Derive the performer from the authenticated session, validate active assignees and enforce roles on the server. Preserve append-only revisions, reject stale expectedVersion values and use idempotency keys to recover ambiguous creation responses without duplicate Actions or lost drafts.

**Outcome:** PR #43 implements the lifecycle. Peer findings led to separate recovery for committed response loss and definitive rejection; component and real-browser regressions cover both. See [Actions evidence](actions.md).

### 5. Atomic Ticket resolution - coding agent

Enforce the complete Ticket transition matrix. Resolve only when a completed Action has a nonblank Result and no unfinished Action remains. Evaluate this gate inside the transaction using the same Ticket lock as Action writes. Preserve Requester advisory behavior, Admin status restrictions and history across closing or reopening.

**Outcome:** PR #45 implements the atomic gate. Tests cover all 64 status edges, competing Action writes and stale displayed readiness; the UI can refresh and retry safely. See [workflow evidence](workflow.md).

### 6. Authoritative and bounded dashboards - coding agent

Compute Requester-owned and Staff/Admin metrics from the database in one consistent snapshot. Define follow-up Action counts separately from distinct-Ticket drill-downs. Return at most five deterministic recent rows without large descriptions. Verify exact metrics, intersecting filters and natural query plans using 5,000 Tickets and 10,000 Actions.

**Outcome:** PR #47 added dashboards; final hardening added the scale check. The fresh main run matched independent database counts and bounded response/query assertions. See [dashboard evidence](dashboards.md) and [main verification](main-verification.md).

### 7. Responsive interaction and accessible feedback - coding agent

Check dashboards, Action forms and workflow feedback at desktop, tablet, mobile and narrow widths. Verify labels, keyboard focus, required-field validation, draft retention and role restrictions. Exercise loading, empty, forbidden, safe failure and conflict states; distinguish simulated UI responses from real authorization tests.

**Outcome:** Real-browser checks include ten permitted role routes and three-width Action forms. Visual inspection corrected the Follow-up checkbox. The main capture contains 75 selected images with checksum provenance. See [visual/accessibility checks](visual-accessibility.md).

### 8. Reproducible review corrections and main acceptance - coding agent

Investigate peer findings using normal project commands and generated dependencies. After the reviewed main merge, run complete regression and browser suites plus both production builds from that exact source on fresh guarded targets. Retain complete outputs, source state, image hashes and remaining submission gates.

**Outcome:** The Dashboard fixture now resolves the server-generated Prisma client without NODE_PATH. Datakung approved all increments and the release. Fresh main verification passed 484 tests / 48 files, 32 browser cases and both builds at 7a697d2. See [main verification](main-verification.md).

## My Reflection

การใช้ AI ในบทบาท specification agent มีประโยชน์เมื่อเปลี่ยนโจทย์กว้างให้เป็นกฎที่ตรวจสอบได้ เช่น ความแตกต่างระหว่าง Ticket Owner กับผู้รับผิดชอบ Action เงื่อนไข Resolve และขอบเขตข้อมูลที่ Dashboard ของแต่ละบทบาทมองเห็น การกำหนด FR, BR และ AC ก่อนพัฒนาทำให้ API หน้าจอ และชุดทดสอบอ้างอิงข้อกำหนดเดียวกัน และช่วยลดการตัดสินใจโดยไม่มีหลักฐานระหว่างเขียนโค้ด

ในบทบาท coding agent สิ่งสำคัญคือการแปลงกฎเหล่านั้นเป็นข้อบังคับที่ backend ไม่ใช่เพียงเงื่อนไขแสดงปุ่ม ตัวอย่างคือหน้าจออาจแสดงว่า Ticket พร้อม Resolve แต่มีผู้ใช้เพิ่ม Action ที่ยังไม่เสร็จในเวลาใกล้กัน การตรวจซ้ำใน transaction ที่ใช้ Ticket lock ร่วมกันจึงจำเป็น ส่วน expectedVersion และ idempotency key แก้คนละปัญหา โดยอย่างแรกป้องกันการเขียนทับข้อมูลเก่า และอย่างหลังป้องกันการสร้างข้อมูลซ้ำเมื่อไม่แน่ใจว่าคำขอเดิมสำเร็จหรือไม่

ข้อแก้ไขจากเพื่อนแสดงให้เห็นว่าผลผ่านบนเครื่องหนึ่งยังไม่เพียงพอ ชุดทดสอบ Dashboard เคยอ้าง Prisma client จากตำแหน่งที่ยังไม่ได้ generate จึงต้องแก้ให้ใช้ client ของ server และรันคำสั่งปกติโดยไม่มีตัวช่วยเฉพาะเครื่อง อีกกรณีคือการกู้คืน Action หลังคำขอถูกปฏิเสธ ต้องเก็บ draft ที่แก้แล้วและแยกจากกรณี server บันทึกสำเร็จแต่ response สูญหาย การรีวิวจึงช่วยตรวจทั้งพฤติกรรมระบบและความน่าเชื่อถือของชุดทดสอบ

แนวทางที่ควรใช้ต่อคือให้ AI ทำงานภายใต้ contract และเกณฑ์ยอมรับที่ชัดเจน ตรวจทั้งกรณีสำเร็จ ผิดพลาด และข้อมูลเปลี่ยนพร้อมกัน แล้วแยกผลทดสอบของผู้เขียน การอนุมัติจากเพื่อน และผลบน main ออกจากกัน หลักฐานในงานนี้เป็นผลที่ agent รันและ peer ตรวจซ้ำ ไม่ใช่การอ้างว่าผู้ส่งรายงานรันทดสอบทุกชุดด้วยตนเอง การอธิบายเหตุผลของการออกแบบและการสาธิตระบบยังเป็นส่วนที่ผู้ส่งงานต้องรับผิดชอบ
