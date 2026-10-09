# Lab 4 UI Specification

Build on the Lab 3 Zen Green tokens and Ticket components. Dashboard navigation is visible only to its role and has `aria-current="page"` on the active route. Server permissions remain authoritative.

## Requester dashboard `/dashboard`

Four compact cards: Open Tickets, Waiting for You, Recently Updated (7 days), Recently Resolved (7 days). Below, up to five recently updated owned Tickets show number, summary, status text and update time. Each card has an accessible link to My Tickets with its filter; each row links to owned Ticket Detail. Use zero values and a clear “No recent tickets” message. Show skeleton/status while loading, Retry for safe failure, and Sign in/Return if session or role is invalid. On mobile, cards stack and links remain touch sized.

## Staff/Admin dashboard `/staff/dashboard`

Cards: Unassigned, Owned by You, Follow-up Actions; compact status and IT Priority counts; up to five recently updated Tickets. Count links open Ticket Queue or filtered list; recent rows open Staff Ticket Detail. Admin sees the same operational summary and retains User Management navigation. Do not repeat the full queue or expose Internal Notes. Distinguish urgent HIGH priority in text and badge. Empty, loading, forbidden and safe failure states match Requester dashboard.

## Actions Taken on Ticket Detail

Show a section after Ticket information/conversation. It lists Action date/time, description, result, status, assignee, performer, follow-up and Attachment Notes. Stable date/ID ordering is visible. Requester mode is read-only. Staff/Admin have Create, View/Edit, Start and Complete/Cancel controls when permitted by the Action/Ticket state. Form fields: date/time, description, result, active-assignee select, Follow-up Required checkbox, conditional Follow-up Note, Attachment Notes. Show field errors next to controls; preserve values after recoverable failures. Save buttons are disabled while a mutation is pending. A stale version displays a conflict banner and Reload action. Completion asks for Result; cancel requires confirmation. History is shown to Staff/Admin as a read-only timeline with actor and time.

### Start an Action

Show an explicitly labelled **Start** button in the Action detail controls for Staff/Admin when the Action is PLANNED and its Ticket is neither CLOSED nor CANCELLED. It sends `PATCH /api/tickets/:ticketId/actions/:actionId/status` with `status: IN_PROGRESS` and the displayed `expectedVersion`. The server records the authenticated performer and a STARTED revision. Requesters never receive Start or other mutation controls. IN_PROGRESS, COMPLETED and CANCELLED Actions have no Start control; terminal Actions and CLOSED/CANCELLED Tickets have no Action mutation controls. Backend role/state/version checks enforce the same rules for direct requests.

While Start is pending, show **Starting…**, disable mutation controls and prevent a second click. On success, refresh the selected Action, list/status badge and history from the server, announce **Action started**, and keep keyboard focus usable. On a stale-version 409, retain displayed/entered information, show an announced conflict and offer **Reload latest** before the user retries against the latest version. Other failures show a safe error; retain information and reload current state before retrying an ambiguous request. Planned coverage is UI-05 and E2E-04 in [tests.md](tests.md), including Staff/Admin success, Requester/terminal restrictions, pending protection and conflict recovery.

The Ticket status UI must show permitted transitions. RESOLVED is unavailable until the server gate passes; a server rejection explains that unfinished Actions remain. After a successful mutation refresh Ticket summary and dashboard-relevant counts on navigation. Requester resolution indication remains separate and advisory.

Staff Ticket detail shows server-provided resolution counts/readiness and a Retry readiness button for statuses that can enter RESOLVED. Missing/failed readiness disables RESOLVED; Action changes refresh readiness while retaining owner/priority drafts. A competing unfinished Action may invalidate displayed readiness: ACTIONS_INCOMPLETE refreshes the gate, announces/focuses the error, retains the attempted status and permits explicit readiness retry after the Actions are completed/cancelled. Stale version or an ambiguous status response requires Reload latest details. Status writes have busy/ref protection against duplicate confirmation/submission. Admin Action permissions retain no Ticket status controls.

## Responsive and accessibility checks

Use existing Zen Green type/color/spacing and status badges; status meaning includes text. Desktop has compact cards and a table/list, tablet wraps cards, mobile stacks cards and Actions without horizontal page scroll. Form labels are explicit; conditional follow-up note is announced; focus moves to error summary after failed submit and returns to trigger after dialog close. Keyboard users can reach all actions, see focus, and operate dialogs. Loading/success/error updates use appropriate live regions. No clipped long descriptions, overlap or inaccessible modal controls at 1440×900, 834×1112 and 390×844.

Visual review checklist: active navigation; card labels/values; zero/empty states; Action read-only/edit distinction; private/shared content distinction; inline validation; focus visibility; modal focus; badge text; no clipping/overlap/horizontal overflow at three widths. Record screenshots under `artifacts/lab-04/screenshots/` after implementation.
