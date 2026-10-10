# Lab 4 AI Use

Tool: Codex desktop with OpenAI models. The user changed the model during LAB4. Exact before/after model names are awaiting the student's confirmation; do not infer them from the agent's identity. The complete chronological prompt record is retained in [ai-use-history.md](ai-use-history.md).

## Eight selected key prompts and observed outcomes

1. “เริ่มอันนี้เลยอันนี้ LAB4” with the LAB4 PDF: inspected the brief and existing Lab 3 baseline; separated the engineering contract from implementation.
2. “ผมเปลี่ยนโมเดลนะ”: continued the same work; the model change is why exact model names must be confirmed rather than guessed.
3. “จัดการเลย” after discussing the first Issue: created #38/#39 for the specification, UI/API contract and test plan before feature implementation. Peer review required explicit recovery and Start-control coverage.
4. “ส่งไปบอกยัง”: posted the actual contract correction reply and requested Datakung's re-review. Author checks were kept separate from independent approval.
5. “ทำต่อเลย” after foundation approval: implemented staged Actions API/UI with server identity, active assignee, immutable revisions, optimistic concurrency and safe creation recovery. Real browser tests reproduced a committed response loss and a definitively rejected creation response loss.
6. “ต่อเลย” after Actions approval: implemented the atomic resolution gate and recoverable Staff UI. A concurrent unfinished Action can invalidate displayed readiness, so the backend transaction rechecks the condition.
7. “เพื่ออนรีวิวละ”: read the dashboard changes-requested review, fixed fixture client resolution through server/package.json and passed both requested commands without NODE_PATH. Datakung approved exact head 884df39 and merged #47 into staging.
8. “งั้นทำเลย” after dashboard approval: opened #48 from approved merge 72c5553, added a real 5,000-Ticket/10,000-Action smoke check, ran complete regression/builds and prepared responsive evidence and this nine-part review report. Actual results and remaining release gates are in [final-verification.md](final-verification.md) and [release.md](release.md).

## My Reflection

**AI-assisted draft for the student to read, revise and confirm before submission.** It is not a verified statement of the student's personal learning.

การแยกงานกำหนดสเปกออกจากงานเขียนโค้ดช่วยให้เห็นกฎที่โจทย์ยังไม่ได้กำหนดชัด เช่น สถานะของ Action เงื่อนไข Resolve และช่วงเวลาที่ Dashboard ใช้คำนวณ เมื่อระบุ FR, BR และ AC ก่อน จึงสามารถใช้ข้อกำหนดเดียวกันตรวจ API, หน้าจอ และชุดทดสอบได้

ตัวอย่างที่ควรอธิบายให้ได้คือ Ticket Owner กับผู้รับผิดชอบ Action เป็นคนละบทบาท และการซ่อนปุ่ม Resolve อย่างเดียวไม่เพียงพอ เพราะผู้ใช้ส่งคำขอ API โดยตรงหรือมีคนเพิ่ม Action พร้อมกันได้ จึงต้องตรวจเงื่อนไขใน transaction ที่ล็อก Ticket ร่วมกับการแก้ Action

การรีวิวจากเพื่อนทำให้พบข้อผิดพลาดที่การทดสอบบนเครื่องผู้เขียนมองไม่เห็น เช่น Prisma client ของชุดทดสอบ Dashboard ถูกเรียกจากตำแหน่งที่ยังไม่ได้ generate การแก้ให้ใช้ client ของ server และรันคำสั่งปกติใหม่แสดงว่าหลักฐานต้องทำซ้ำได้ ความสำเร็จบนเครื่องหนึ่งยังไม่เพียงพอ ผลทดสอบบน feature branch ก็ต้องแยกจากผลบน main หลังรีวิวและ merge จริง

ก่อนส่ง ฉันต้องทดลองสาธิตด้วยตนเอง อธิบายเงื่อนไขธุรกิจ ตรวจชื่อโมเดลที่ใช้จริง และปรับข้อความสะท้อนคิดนี้ให้ตรงกับสิ่งที่ฉันได้เรียนรู้
