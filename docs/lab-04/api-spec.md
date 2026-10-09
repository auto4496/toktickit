# Lab 4 REST API Contract

Base `/api`; JSON and ISO 8601 UTC instants. Lab 3 cookie session, password gate, exact Origin/CSRF on writes and safe error envelope remain in force. `REQUESTER` is scoped to `requesterId = session.user.id`; `IT_STAFF` and `ADMINISTRATOR` can read all Tickets. Missing/non-owned Ticket or Action returns the same `404 RESOURCE_NOT_FOUND`. Role denial returns `403 FORBIDDEN`.

## Actions Taken

Current Action DTO:

```json
{
  "id": "uuid", "ticketId": "uuid", "actionAt": "2026-10-04T09:30:00.000Z",
  "description": "Checked the VPN client", "result": "",
  "assignedTo": { "id": "uuid", "name": "Jordan Lee", "isActive": true },
  "createdBy": { "id": "uuid", "name": "Alex Rivera" },
  "performedBy": { "id": "uuid", "name": "Alex Rivera" },
  "followUpRequired": true, "followUpNote": "Ask for a new log",
  "attachmentNotes": "See vpn-log.txt on this Ticket", "status": "PLANNED",
  "version": 1, "createdAt": "2026-10-04T09:30:00.000Z",
  "updatedAt": "2026-10-04T09:30:00.000Z"
}
```

| Method/path | Roles | Behavior |
|---|---|---|
| `GET /tickets/:ticketId/actions/eligible-assignees` | Staff/Admin | Active IT_STAFF/ADMINISTRATOR choices only; `{data:[{id,name,isActive}]}` ordered by name/ID. Separate from Ticket Owner choices so existing Staff-only owner permissions are retained. |
| `GET /tickets/:ticketId/actions?page=1&pageSize=20` | owning Requester; Staff/Admin | Ordered `actionAt ASC, id ASC`; `{data,meta}` with one-based page and pageSize 10/20/50. Requesters receive shared Action fields, not revisions. |
| `GET /tickets/:ticketId/actions/:actionId` | owning Requester; Staff/Admin | `{data}`; Staff/Admin additionally receive `revisions` sorted `createdAt ASC,id ASC`. |
| `POST /tickets/:ticketId/actions` | Staff/Admin | Create PLANNED Action, version 1; `201 {data}`. Requires `Idempotency-Key` UUID. |
| `PATCH /tickets/:ticketId/actions/:actionId` | Staff/Admin | Edit nonterminal fields with `expectedVersion`; `200 {data}`. |
| `PATCH /tickets/:ticketId/actions/:actionId/status` | Staff/Admin | Transition to `IN_PROGRESS`, `COMPLETED` or `CANCELLED` with `expectedVersion`; `200 {data}`. |

Create body requires `actionAt`, `description`, `assignedToId`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `result` (empty permitted). Edit body uses the same fields plus integer `expectedVersion`. Status body has exactly `status`, `expectedVersion`, and `result` when completing; completion Result must be nonblank. Server rejects identity, Ticket/status/audit overrides and unknown keys. `assignedToId` must identify an active Staff/Admin. `actionAt` must have a timezone offset (`Z` accepted). `409 ACTION_CONFLICT` means stale version; `409 ACTION_READ_ONLY` means terminal Action/Ticket; `409 INVALID_ACTION_TRANSITION` means forbidden edge. Duplicate idempotency key with different normalized payload returns `409 IDEMPOTENCY_KEY_REUSED`; same payload replays `200` with `Idempotency-Replayed: true`. Invalid input returns `400 VALIDATION_FAILED` with field errors; inactive assignee returns `400 ASSIGNEE_NOT_ELIGIBLE`. Unexpected errors return a safe 5xx envelope and correlation ID.

Actions are stored under one Ticket. The list and detail never include attachment bytes. `performedBy` is the authenticated latest write actor; `createdBy` is immutable. Revisions hold the resulting snapshot, actor and operation (`CREATED`, `EDITED`, `STARTED`, `COMPLETED`, `CANCELLED`). There is no history mutation endpoint.

## Ticket workflow increment

`PATCH /staff/tickets/:ticketId/status` keeps the Lab 3 body (`currentStatus`, `expectedVersion`, optional `confirmed`). Entry into `RESOLVED` additionally checks the Action gate inside the same Ticket-row transaction and shared account/Ticket locks used by Action writes. Failure returns `409 ACTIONS_INCOMPLETE` with a safe message and no Ticket mutation. Version mismatch still returns `409 TICKET_CONFLICT`; active owner and confirmation checks retain precedence. The transition matrix and Staff-only status permission are in [specification.md](specification.md). Requester resolution indication remains advisory.

Staff/Admin Ticket detail and operational mutation responses add `data.resolutionGate: {ready:boolean, unfinished:number, completedWithResult:number}` to the existing DTO. `unfinished` counts PLANNED/IN_PROGRESS Actions; `completedWithResult` counts COMPLETED Actions with a Result containing a non-whitespace character (including Unicode trim whitespace). `ready` requires zero unfinished and at least one documented completion. Counts exclude other Tickets and do not expose Action text/actors/history. GET detail uses one repeatable-read snapshot; status mutation rechecks the gate under the Ticket lock and returns the updated detail from its transaction. Owning Requester read/indication DTOs retain their prior shape. Readiness reports the Action condition; valid transition, active owner, Staff permission, version and confirmation are also required to Resolve.

## Dashboards

`GET /dashboard/requester`: Requester only. `GET /dashboard/staff`: Staff/Admin only. Both are computed from one database snapshot with `asOf` UTC and `windowStart = asOf - 7×24h` in the response. No query parameters. Counts are integers and lists are at most five items. Recent Ticket rows contain only `id`, `ticketNumber`, `summary`, `currentStatus`, `itPriority`, `updatedAt` and a detail `href`; Requester payload omits `itPriority` if that field is not part of its approved Ticket DTO.

Requester response: `{asOf,windowStart,metrics:{open,waitingForRequester,recentlyUpdated,recentlyResolved},recentTickets:[...]}`. All queries constrain `requesterId` to the session user. `open` excludes RESOLVED/CLOSED/CANCELLED; `waitingForRequester` is WAITING_FOR_REQUESTER; `recentlyUpdated` uses `windowStart <= updatedAt <= asOf`; `recentlyResolved` means current status RESOLVED within that same window (a recent activity proxy, not a historical transition counter). `recentTickets` uses owned Tickets in that window, newest update first. Links: open → `/tickets?status=open`; waiting → `/tickets?currentStatus=WAITING_FOR_REQUESTER`; recent → `/tickets?sortBy=updatedAt&sortDirection=desc`; resolved → `/tickets?currentStatus=RESOLVED`. The Requester list/API must support `status=open` as the same nonterminal status scope used by the open metric. Recent and resolved links open the corresponding sorted/status lists; they do not impose the dashboard's seven-day window on the list.

Staff response: `{asOf,windowStart,metrics:{unassigned,myOwned,myFollowUps,byStatus:{NEW,...},byPriority:{LOW,MEDIUM,HIGH}},recentTickets:[...]}`. `unassigned` means `ownerId=null` and nonterminal; `myOwned` means `ownerId=session.user.id` and nonterminal; `myFollowUps` counts current-user assigned Actions with `followUpRequired=true` and PLANNED/IN_PROGRESS on nonterminal Tickets. `byStatus` counts all Tickets, including terminal; `byPriority` counts all by IT Priority. `recentTickets` uses `windowStart <= updatedAt <= asOf`. Links: unassigned → `/staff/tickets?owner=unassigned&status=open`; my owned → `/staff/tickets?owner=me&status=open`; status → `?currentStatus=...`; priority → `?itPriority=...`; follow-ups → `/staff/tickets?actionAssignee=me`. The Staff list/API must support `status=open` with the same nonterminal scope as the owner metrics, and `actionAssignee=me` by selecting nonterminal Tickets with at least one current-user assigned unfinished follow-up Action; a Ticket is listed once even when several Actions match, so the Action metric may exceed the number of Tickets. A zero metric still has its label and count; empty recent list is `[]`. Any database failure returns a safe `503 DASHBOARD_UNAVAILABLE` response with no partial metrics.

All dashboard `href` values are internal relative paths. The destination list parses the documented filters and displays a no-results state when empty. Dashboard responses do not include notes, passwords, session data or full Ticket collections.
