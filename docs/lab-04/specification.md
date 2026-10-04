# Lab 4 Engineering Contract

Status: proposed contract awaiting review for [Issue #38](https://github.com/auto4496/toktickit/issues/38). The initial contract was committed separately in `dd34049` before feature implementation. Baseline: integrated Lab 3 `origin/main` at `da5a566`.

## 1. Sprint goal

Complete the service desk lifecycle with accountable Actions Taken, a server-enforced resolution gate, and concise role dashboards while preserving Lab 1–3 behavior.

## 2. Stakeholder request

Staff plan and record individual work under a Ticket. The Ticket Owner coordinates the case, while another eligible staff member can be assigned to an Action and perform it. Requesters can see Actions and indicate apparent resolution; staff formally change Ticket status. Dashboards lead to the existing detailed screens.

## 3. Scope

Included: Action model, immutable revision history, create/assign/edit/complete/cancel/list, final Ticket status enforcement, Requester and Staff dashboards, additive migration, idempotent demo seed, responsive Zen Green UI, authorization and regression. Admins may perform staff Action operations and use the Staff dashboard. Lab 3 session and role rules remain authoritative.

Excluded: SLA/escalation, notifications, inventory, billing, approvals, BI/export, multi-tenancy and production cloud operations. Attachment Notes refer to existing Ticket files; Actions add no separate file upload.

## 4. Functional requirements

| ID | Requirement |
|---|---|
| FR-01 | Staff/Admin list Actions on any Ticket; Requesters read Actions only on owned Tickets. |
| FR-02 | Staff/Admin create an Action with date/time, description, result, assignee, follow-up flag/note and attachment notes; server records actor. |
| FR-03 | Staff/Admin edit, reassign, complete or cancel a nonterminal Action with a version check. |
| FR-04 | Every Action mutation appends an immutable revision with actor, time, operation and resulting values. |
| FR-05 | Formal Ticket resolution requires a valid Lab 3 transition and the Action completion gate. |
| FR-06 | Requester dashboard shows owned open, waiting, recently updated and recently resolved Tickets. |
| FR-07 | Staff dashboard shows unassigned, owned, status/IT Priority counts, follow-up Actions and recent Tickets. Admin may use it. |
| FR-08 | Cards and recent entries lead to Ticket list/detail, with loading, zero, forbidden, conflict and failure feedback. |
| FR-09 | Existing authentication, user management, conversations, attachments and Ticket journeys remain functional. |

## 5. Business rules

| ID | Rule |
|---|---|
| BR-01 | One Action belongs to exactly one Ticket. Restrictive foreign keys preserve history. |
| BR-02 | Ticket Owner, Action assignee and performer may be different eligible staff members. |
| BR-03 | Server sets creator, latest performer and audit times from the authenticated session/clock; client overrides are rejected. |
| BR-04 | Action date/time is a required ISO 8601 instant selected by staff, stored/returned in UTC; past and future are allowed. |
| BR-05 | Description is 1–2000 Unicode code points. Result is 0–2000 until completion and 1–2000 on completion. Optional notes are at most 2000; normalize NFC, CRLF to LF, and trim. |
| BR-06 | Follow-up Note is required when Follow-Up Required is true; clear it when false. |
| BR-07 | A new assignee must be active IT_STAFF or ADMINISTRATOR. Historical inactive assignees remain visible. |
| BR-08 | Action statuses: PLANNED → IN_PROGRESS/COMPLETED/CANCELLED; IN_PROGRESS → COMPLETED/CANCELLED. Completed/cancelled rows are immutable. |
| BR-09 | Staff/Admin can work on any Ticket; CLOSED/CANCELLED Tickets reject Action writes. Requesters never write Actions. |
| BR-10 | Edit/transition requires `expectedVersion`; transaction row lock and version comparison return 409 on stale writes. Creation uses `Idempotency-Key` to make retries safe. |
| BR-11 | Successful Action mutations append a revision atomically; no revision edit/delete API exists. |
| BR-12 | Only IT_STAFF changes Ticket status. Admin Action permissions do not grant Ticket status permission. Existing owner/confirmation/version conditions remain. |
| BR-13 | RESOLVED additionally requires at least one COMPLETED Action with nonblank Result and zero PLANNED/IN_PROGRESS Actions. Requester indication stays advisory. |
| BR-14 | CLOSED requires RESOLVED; reopening retains Actions. CANCELLED is terminal. |
| BR-15 | Dashboard open excludes RESOLVED/CLOSED/CANCELLED. Recent means `updatedAt >= now − 7 days` using a UTC instant from one server clock snapshot. |
| BR-16 | Recent lists contain at most five rows sorted `updatedAt DESC, id DESC`; empty counts are zero and lists are `[]`. |
| BR-17 | Dashboard links use Ticket list filters, including the documented open-status and Action-assignee scopes; responses expose no Internal Notes or whole Ticket collections. |
| BR-18 | Existing Tickets need no backfill: zero Actions is valid history, but they cannot newly enter RESOLVED. Existing RESOLVED/CLOSED Tickets remain as recorded. |

### Final Ticket transition matrix

| From | Permitted next statuses |
|---|---|
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | REOPENED |
| REOPENED | OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED |
| CANCELLED | none |

## 6. UI specification summary

[ui-spec.md](ui-spec.md) defines Dashboard and Actions layout, form modes, role behavior, mobile arrangement, keyboard/focus behavior and feedback. Status and priority use text as well as color. Requesters see read-only Actions.

## 7. Data changes

Add `ActionTaken` (UUID, Ticket/assignee/creator/latest-performer FKs, action time, normalized text, follow-up fields, status, version and timestamps) and `ActionRevision` (Action/actor FKs, operation, immutable value snapshot and timestamp). Index `(ticketId, actionAt, id)`, `(ticketId, status)`, `(assigneeId, status)`. An integer version follows existing Ticket concurrency behavior. A separate revision table keeps the current Action compact and retains append-only evidence of edits; these are the two main design decisions.

Migration is additive and does not delete/backfill Ticket rows. Before migration, back up the database and attachment directory and record counts. Apply first to isolated test DB; verify User, Ticket, Attachment, Comment and Note counts and FKs. On failure restore the pre-migration backup rather than resetting development data. Seed deterministic examples across statuses, priorities, assigned/unassigned Tickets and zero/one/multiple Actions; insert only missing rows, never overwrite edits/passwords.

## 8. API contract

[api-spec.md](api-spec.md) gives exact paths, fields, response shapes, role/ownership checks, conflicts, ordering and calculations. All writes retain Lab 3 cookie session and CSRF enforcement.

## 9. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-01 | Staff/Admin create an Action under the right Ticket with server actor and active assignee. |
| AC-02 | Requester reads owned Actions, cannot read another Ticket or mutate Actions. |
| AC-03 | Invalid fields/inactive assignee leave no Action or revision. |
| AC-04 | Edit/transition records ordered revisions; stale/terminal updates fail safely. |
| AC-05 | Same-key retries create one Action; same key with different payload conflicts. |
| AC-06 | Every Ticket status edge and the resolution gate are enforced by the backend. |
| AC-07 | Requester dashboard matches owned database queries without leakage. |
| AC-08 | Staff dashboard counts/order match queries, and drill-down reaches matching Tickets. |
| AC-09 | Migration preserves Lab 3 data and seed reruns do not overwrite records. |
| AC-10 | Desktop/tablet/mobile UI handles loading, empty, invalid, conflict, forbidden and failure states accessibly. |
| AC-11 | Full Lab 1–3 authentication, ownership, attachment, conversation, staff and admin regression passes. |

## 10. Product Definition of Done

Every AC maps to passing tests in [tests.md](tests.md); backend role, ownership and concurrency checks pass; migration/seed are verified on the isolated test DB; full build/regression and desktop/tablet/mobile/keyboard checks pass; README/demo/evidence are current; peer review is resolved; final submission claims reflect observed results.

## 11. Assumptions and decisions

The handout does not specify Action statuses, assignee representation, dashboard window or precise resolution gate. This contract chooses explicit statuses, one current assignee, seven days UTC and one completed Action with Result before resolution. Ticket status authority remains Lab 3's. These choices remain open for peer review before integration into staging.
