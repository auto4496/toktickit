# Lab 3 Zen Green UI Specification

Status (2026-09-26): Implementation, integrated evidence and accessibility corrections are peer-approved and merged through PR #35. Issue #30 prepares the final release. [System verification](system-verification.md) records actual image inspection and distinguishes it from the final human checklist, which remains pending.

User direction (2026-09-08): polished, attractive UI that follows the assignment. Reuse the Lab 2 design system; make the first staff/admin increment feel like one coherent product.

## 1. Visual direction and reusable components

Use a quiet off-white canvas, white cards, restrained borders, deep-green navigation, generous spacing and strong typography. Prioritize a clear page title, task context and one dominant action per panel. Avoid excessive shadows, gradients, decorative charts, oversized marketing copy and crowded spreadsheets. Preserve the existing TokTickIT wordmark; no new logo or imagery is needed.

Inherited tokens from [Lab 2 UI specification](../lab-02/ui-spec.md): primary #006B3C, hover #005A33, secondary/focus #0B7A46, pale green #EAF6EF, page #F5F7F6, surface #FFFFFF, text #17352A, muted #52665E, border #CCD8D2, readonly #F0F3F1, error #B42318 / #FEF3F2, warning #9A6700 / #FFF7E0. No hard-coded alternative theme colors in feature screens. Semantic badges combine these existing tokens with explicit labels/icons.

| Element | Contract |
|---|---|
| Content width | Queue/admin max 1200px; detail max 1120px; login/password card max 440px. Center content. |
| Header | 64px desktop; brand, role navigation, current user/role, Logout. Mobile allows two clean rows/menu without clipping. |
| Page spacing | 32px desktop, 24px tablet, 16px mobile; 24px between sections and 16px inside related groups. |
| Type | Existing Inter/Segoe UI/system stack; body 16px/1.5, labels/helper text >=14px; page titles 30px desktop/26px mobile. |
| Surfaces | Cards 10px radius, 1px neutral border; use existing subtle shadow sparingly. Buttons/inputs 6px radius. |
| Controls | >=44px height and 44x44 touch targets; visible labels; no unlabeled icon-only primary action. |
| Tables | Calm header, 14-16px text, >=64px ticket rows, clear hover/focus; row links remain explicit. |
| Focus/error | 2-3px visible token-based focus ring; inline linked field errors; summary/banner announces submit failures. |

Extract/reuse ApplicationShell, PageHeader, FormField, Button, StatusBadge, PriorityBadge, RoleBadge, StatePanel, ConfirmationDialog, Pagination and AttachmentList from established styles. Share ticket information blocks between Requester and staff detail. Components accept permitted actions/data; backend authorization remains authoritative. Avoid three duplicated detail forms with divergent validation.

## 2. Routes and navigation

| Route | Screen / permission |
|---|---|
| `/login` | Public login card |
| `/change-password` | Any authenticated role; only application route for initial-password user |
| `/tickets`, `/tickets/new`, `/tickets/:ticketId` | Requester own workflows |
| `/staff/tickets`, `/staff/tickets/:ticketId` | IT Staff queue/detail; Administrator secondary Ticket Lookup with narrow rights |
| `/admin/users` | Administrator user management |

Landing pages: Requester My Tickets; IT Staff Ticket Queue; Admin Users. Admin secondary navigation says Ticket Lookup, not My Queue. Current-user bootstrapping shows a neutral busy shell before protected content; never flash another role's controls. Preserve only a validated internal permitted intended route after login; otherwise use the role landing page. No open redirects.

Legacy `/select-requester` redirects to login. Remove Development Requester selector/notice, Change Requester, X-Requester-Id headers and persisted identity state. Logout first revokes server access, then clears all protected caches/drafts/creation keys and returns to login. On failed logout, show retry and do not claim successful revocation. On 401 from any protected request, clear protected data and return to login with concise session-expired feedback. 403 PASSWORD_CHANGE_REQUIRED navigates to password change; other 403 shows forbidden without stale content.

## 3. Login and Change Password

Login: centered white card with brand, "Sign in to TokTickIT", brief helper, Email, Password with accessible show/hide button, and full-width Sign In. No social-login, registration or forgotten-password email links. Use autocomplete username/current-password; allow paste. Empty/invalid email fields get inline errors. Busy button reads "Signing in..." and prevents double submission. Generic credential failure does not identify inactive versus unknown users. Rate-limit feedback shows wait/retry guidance from Retry-After. Network failure retains email; clear password on success/navigation and never persist it.

Change Password: same visual card, heading "Choose your new password", explanation of initial-password requirement, Current Password, New Password, Confirm Password, always-visible 15-128 character passphrase guidance and primary "Save password and continue". New fields use autocomplete new-password. Show mismatch/length/current-password validation where it occurs. Initial-password users have Logout available but no application navigation or skip action. Successful change opens the role landing page. Ordinary voluntary password change uses the same form and may offer a Back action for full sessions.

## 4. Requester continuity

Preserve Create Ticket/My Tickets/Attachment usability and field validation from Lab 2. Current name comes from the session. New IT Priority is displayed as a read-only badge equal to Requested Priority initially. Requester detail contains grouped ticket metadata, description, Attachments and a Public Comments section; no Internal Notes tab, badge, count or empty placeholder.

In allowed states, show a secondary "Problem appears resolved" action with a confirmation explaining "IT Staff will review this and formally resolve or close your ticket." On success display "You reported this problem appears resolved" with server time; keep the actual status badge unchanged. Disable the repeat action with explanatory text. CLOSED/CANCELLED conversations show readable history and "This ticket is read-only"; existing Requester attachment actions remain available under inherited ownership rules.

## 5. IT Staff Ticket Queue

Page header: "Ticket Queue", short context "Find and prioritize support requests", and count of matching results. No create-ticket action for staff. A search field spans useful width with explicit label and clear action; filter toolbar contains Status, IT Priority, Category and Owner (All, Unassigned, Assigned to me, eligible named owner), plus Sort and Clear Filters. Queries apply on Search/Apply or Enter, not every keystroke; changes reset page to 1. For Admin lookup omit owner-selection lookup and present All/Unassigned/Assigned to me only; API UUID filtering remains available to authorized queries.

Desktop table uses six columns to avoid a mega-grid:

| Column | Display |
|---|---|
| Ticket | Green linked Ticket Number and Summary below; summary wraps to two lines; accessible full text in the detail link |
| Category | Plain readable label |
| Priority | IT Priority badge prominent; secondary labelled "Requested: High" (or actual value) |
| Status | Text/icon status badge with enough width for Waiting for Requester |
| Owner | Name or neutral "Unassigned"; historical inactive owner explicitly labelled |
| Updated | Localized date/time with full timestamp available; no ambiguous relative-only time |

Created date and Related System belong in detail; sorting by created date remains in the Sort control. The result range and page-size control sit below the table with Previous/Next and page numbers. Stable row heights, aligned cells and restrained badge colors matter more than maximum density. Do not make the whole row an inaccessible click target.

At tablet widths stack the toolbar and use ticket cards if six columns would squeeze labels. Below 768px always use cards: number/status in first row, summary, category, requested/IT priority, owner/update, explicit "Open ticket" link. Show filters in a collapsible inline panel with aria-expanded; no horizontal page scrolling.

States: loading skeleton matching result layout; empty queue "No tickets yet"; filtered no-results with Clear Filters; failure panel with Retry; forbidden with a permitted-home link. Failed queries never silently display old results under new filter labels. On a background refresh failure, retained results must be labelled as previous results and kept bound to their original query.

## 6. IT Staff Ticket Detail

Top: breadcrumb Back to Queue, Ticket Number and summary, status badge and updated timestamp. Desktop grid uses approximately 2fr content / 1fr operational card; narrow screens stack ticket content, operational controls, attachments and conversation in that order. No sticky panel may obscure focus or content.

Content card: requester, created date, category, related system, requested priority, description. Historical data are read-only text on subtle readonly surfaces, not disabled low-contrast inputs. Long descriptions/filenames wrap safely.

Operational card: owner, "Claim ticket" if unassigned, owner picker + confirmed Assign/Reassign, IT Priority selector + Save, permitted-next-status selector + Update. Keep each operation's busy/success/error feedback local. Selecting values does not immediately mutate the server. Show only valid next statuses, but also explain why an action is unavailable (for example "Assign an active owner before starting work"). Confirm resolve/close/reopen/cancel with the ticket number and exact target state. Reassignment shows old/new owner. Cancelling a dialog leaves values/data unchanged.

Admin detail uses the same read-only content and conversation/attachment views, with only IT Priority editable. Never show Claim, owner editing, status editing or a conversation composer for Admin. This visibly implements the narrow authorization matrix.

Conversation uses separate "Public Comments" and "Internal Notes" tabs for Staff/Admin. A Public composer carries the label "Visible to the requester"; Internal Notes shows a lock icon, amber-tinted header and "Internal - visible only to IT Staff and Administrators". Separate draft state per tab; switching never copies private text to the public draft. Post buttons read "Post public comment" and "Add internal note". Display author, role and timestamp on each entry. Render plain text, never raw HTML. Keep tabs keyboard operable; show the active tab in text/underline, not just color.

For uncertain post failures retain the relevant draft and reload conversation before offering Retry; no automatic append retry. For version conflict preserve the attempted selection separately, show "This ticket changed. Reload the latest details before trying again", and require a fresh deliberate submit after reload. Never silently overwrite a colleague's work.

Attachments reuse the existing list: safe filename/type/size, active Download, Removed/Unavailable labels, no preview. Staff/Admin have no upload/remove controls. Requester indication appears as a pale-green callout distinct from the formal status.

## 7. Minimal Administrator User Management

Page header: "Users", brief helper, primary "Create user". Search by name/email and one optional Role filter; no dashboard cards, bulk actions, export, delete, departments or mandatory pagination.

Desktop: table columns Name, Email, Role, Status, Edit; editing/creation opens a right-hand panel around 400px wide with a clearly labelled close/cancel action. At tablet/mobile use a full-width form view and Back to Users, avoiding two narrow columns. Table becomes cards on mobile, with a visible Edit button for every item.

Create form: Name, Email, single Role select, Active switch with textual Active/Inactive state, Initial Password with show/hide and confirmation. UI confirmation is compared before sending the API's initialPassword field. Save User/Cancel at the bottom. Explain initial password must be communicated manually and changed on first login. No "send password reset email" checkbox from the sample image.

Edit form: same basic fields except password; separate "Set new initial password" action opens a small confirmation dialog with initial/confirm fields. Explain it signs out existing sessions and forces a password change. An Admin's own Active switch is locked active with helper text; backend still enforces it. Last-admin and active-ticket-owner failures show the safe reason next to the attempted role/activation control and preserve entered basic data. No deletion button.

After create/edit refresh the list from server data and announce success. Reset clears password inputs immediately after success and shows no password in list/toast/log. If own role/reset revokes the session, return to login with an accurate explanation. Conflicts require reload/review; no silent overwrites. Dirty non-password form closes require discard confirmation. Password drafts clear on cancel/unmount.

## 8. Required modes, feedback and accessibility

Main modes are login/change-password, list, view, create and edit. Loading/validation/conflict are feedback within these modes, not invented formal business states. Every implemented screen must demonstrate meaningful busy, success, safe failure and forbidden behavior; lists additionally demonstrate empty/no-results; details demonstrate not-found; versioned forms demonstrate conflict.

Use semantic headings and landmarks, labelled inputs, aria-describedby errors, aria-invalid and live status messages. On invalid submit focus the first invalid field. Dialogs support Escape where cancellation is permitted, focus trapping, labelled title and focus restoration. Menus expose expanded state. Statuses/roles/priorities contain readable text; icons complement it. Keep normal text contrast consistent with inherited WCAG AA design targets. Check browser zoom and long content manually; automated DOM assertions do not prove visual quality.

## 9. Responsive and visual evidence

Breakpoints: desktop >=992px; tablet 768-991px; mobile <768px. Verify 1440x900, 834x1112, 390x844 plus a narrow 320px overflow check. Major screenshot groups under `artifacts/lab-03/screenshots/`:

| Folder | Required scenes at desktop/tablet/mobile |
|---|---|
| authentication/ | login-ready, login-invalid, change-password, authenticated role navigation |
| staff-queue/ | realistic results and responsive filters/pagination; supplementary empty/no-results/failure |
| staff-ticket-detail/ | operational controls + Public Comments, clearly distinct Internal Notes, conflict/validation/terminal states, Admin restricted view |
| user-management/ | user list, create/edit, initial-password dialog, safety validation |
| requester/ | owned detail with public conversation/resolution indication and attachment continuity |

Use consistent names `<viewport>-<scene>.png`; routine test captures stay in ignored test-results, curated captures use an explicit evidence command. Screenshot fixtures are synthetic, show no passwords/tokens and have enough rows/text to test realistic density.

Integrated capture uses `npm run test:e2e:capture:lab3` and groups the required scenes under `artifacts/lab-03/screenshots/system/{system-states,staff-workflow,user-management}/`. Its manifest is the authoritative filename index. `system-states` includes authentication, Requester, conflict/terminal and restricted Admin scenes; inherited feature captures retain their original names. Explicitly simulated busy/failure/empty scenes are labelled in filenames. The integrated browser check found a confirmation keyboard-cycle defect; shared confirmation and reset dialogs now explicitly wrap focus and preserve Escape/opener behavior. The final human checklist below remains distinct from agent inspection recorded in system-verification.md.

Final human visual checklist (all unchecked until actual inspection):

- [ ] Same tokens, typography, spacing, radii and primary-action hierarchy across all roles.
- [ ] Queue readable without an oversized grid; mobile cards retain all important fields/actions.
- [ ] Internal/private composer unmistakable; no private draft appears in public composer.
- [ ] Read-only and editable fields, status/priority/role badges and inactive accounts are clear.
- [ ] Busy, success, validation, safe failure, forbidden, no-results, not-found and conflict are legible.
- [ ] No clipped labels, overlapping cards/dialogs, offscreen actions or horizontal page overflow.
- [ ] Keyboard focus/dialog restoration, linked errors, labels, text contrast and touch targets checked.
- [ ] No excluded reset-email/Service Actions/admin bulk features copied from illustrative screenshots.
- [ ] Screenshots correspond to the final reviewed commit; results recorded in tests.md.
