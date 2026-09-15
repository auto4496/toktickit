# IT Staff workflow — Issue #27

This increment starts from the approved foundation merge `1bf45888cdf4691f198d2c3d9ca38b164b6516f0` on `lab3-staging`. It adds the shared ticket queue, operational detail, ownership, IT Priority, eight-status workflow, public comments, private internal notes and Requester apparent-resolution indication. User administration remains Issue #28.

## Try the screens

IT Staff land on `/staff/tickets`. Apply search, status, category, priority and owner filters; open a ticket through its explicit link. Claim an unassigned ticket or confirm reassignment. Assignment does not change status. Save IT Priority separately; Requested Priority remains unchanged. Select a permitted next status, with confirmation for resolve/close/reopen/cancel. If another person changes the same version, reload and review before submitting again.

Public Comments are visible to the requester. Internal Notes have their own tab, draft and private notice. Posts are append-only plain text. On an uncertain failure, the draft remains and history reloads before another deliberate attempt. Closed/cancelled conversation is read-only; closed tickets may be reopened by IT Staff.

Requesters retain their existing ticket and attachment screens, now with public conversation. “Problem appears resolved” records the server time without changing the actual status. Reopening clears that indication. Requester attachment operations remain available on terminal tickets as required by Lab 2 continuity.

Administrators use Ticket Lookup to read tickets, attachments and both conversation types, with IT Priority as their only editable ticket field. There are no claim, status, owner or posting controls for Admin.

## Concurrency and privacy integration

All operational mutations and conversation appends take the transaction-scoped account advisory lock `(334, 3)`, revalidate the current actor/session, then lock the ticket row. Owner eligibility is checked inside that transaction. **Issue #28 account mutations must call `lockAccounts` from `server/src/account-lock.ts` before changing user role/activity and before acquiring ticket locks.** The current API tests demonstrate assignment waiting on this same lock; actual Admin endpoint integration is part of #28.

Operational mutations require the displayed `expectedVersion` and increment it atomically. Conversation appends update the timestamp without incrementing the operational version. Requester resource ownership is checked before operation fields or conversation query validation. Note access is denied by role before resource lookup. Queue and conversation pages use repeatable-read transactions for consistent totals. Error logs for these new endpoints contain only the error type/code and correlation information, not SQL messages or submitted content.

No schema migration is added in this increment: the approved foundation already contains the owner/version/indication and conversation tables. Existing development data is not reset or migrated by this task.

## Verification entry points

- `server/tests/lab-03/staff-workflow.api.test.ts`: queue, permissions, 64 status edges, actual concurrent requests, ownership/priority/indication, public/private conversation and safe failure checks. This combined suite maps API-06 through API-11 rather than splitting the same fixture lifecycle across the originally planned filenames.
- `client/tests/lab-03/StaffWorkflow.test.tsx`: queue states, explicit filter application, detail confirmation/conflict/Admin restrictions, separate drafts, uncertain-post handling and Requester indication. It maps UI-04 through UI-07.
- `playwright.staff.config.ts`: isolated real-browser staff/requester/Admin workflow plus desktop/tablet/mobile/320px screenshots. Set a guarded `TEST_DATABASE_URL`; optional `E2E_CLIENT_PORT`/`E2E_API_PORT` avoid an existing local preview.
- The inherited attachment unit/UI suite isolates its new `RequesterWorkflow` child; the new feature suite and real-browser test cover that integration. The shell unit suite similarly isolates queue contents while retaining its original authentication assertions. No existing test case was removed.

Execution results, failures and visual evidence are recorded in [tests.md](tests.md). A passing author check is not peer approval; the reviewer merges the PR after review.
