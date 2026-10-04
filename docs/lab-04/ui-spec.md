# Lab 4 UI Specification

Build on the Lab 3 Zen Green tokens and Ticket components. Dashboard navigation is visible only to its role and has `aria-current="page"` on the active route. Server permissions remain authoritative.

## Requester dashboard `/dashboard`

Four compact cards: Open Tickets, Waiting for You, Recently Updated (7 days), Recently Resolved (7 days). Below, up to five recently updated owned Tickets show number, summary, status text and update time. Each card has an accessible link to My Tickets with its filter; each row links to owned Ticket Detail. Use zero values and a clear “No recent tickets” message. Show skeleton/status while loading, Retry for safe failure, and Sign in/Return if session or role is invalid. On mobile, cards stack and links remain touch sized.

## Staff/Admin dashboard `/staff/dashboard`

Cards: Unassigned, Owned by You, Follow-up Actions; compact status and IT Priority counts; up to five recently updated Tickets. Count links open Ticket Queue or filtered list; recent rows open Staff Ticket Detail. Admin sees the same operational summary and retains User Management navigation. Do not repeat the full queue or expose Internal Notes. Distinguish urgent HIGH priority in text and badge. Empty, loading, forbidden and safe failure states match Requester dashboard.

## Actions Taken on Ticket Detail

Show a section after Ticket information/conversation. It lists Action date/time, description, result, status, assignee, performer, follow-up and Attachment Notes. Stable date/ID ordering is visible. Requester mode is read-only. Staff/Admin have Create, View/Edit and Complete/Cancel controls on nonterminal Tickets/Actions. Form fields: date/time, description, result, active-assignee select, Follow-up Required checkbox, conditional Follow-up Note, Attachment Notes. Show field errors next to controls; preserve values after recoverable failures. Save buttons are disabled while a mutation is pending. A stale version displays a conflict banner and Reload action. Completion asks for Result; cancel requires confirmation. History is shown to Staff/Admin as a read-only timeline with actor and time.

The Ticket status UI must show permitted transitions. RESOLVED is unavailable until the server gate passes; a server rejection explains that unfinished Actions remain. After a successful mutation refresh Ticket summary and dashboard-relevant counts on navigation. Requester resolution indication remains separate and advisory.

## Responsive and accessibility checks

Use existing Zen Green type/color/spacing and status badges; status meaning includes text. Desktop has compact cards and a table/list, tablet wraps cards, mobile stacks cards and Actions without horizontal page scroll. Form labels are explicit; conditional follow-up note is announced; focus moves to error summary after failed submit and returns to trigger after dialog close. Keyboard users can reach all actions, see focus, and operate dialogs. Loading/success/error updates use appropriate live regions. No clipped long descriptions, overlap or inaccessible modal controls at 1440×900, 834×1112 and 390×844.

Visual review checklist: active navigation; card labels/values; zero/empty states; Action read-only/edit distinction; private/shared content distinction; inline validation; focus visibility; modal focus; badge text; no clipping/overlap/horizontal overflow at three widths. Record screenshots under `artifacts/lab-04/screenshots/` after implementation.
