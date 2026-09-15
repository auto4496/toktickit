# Lab 3 Sprint Engineering Specification

Status: Draft for peer review before implementation. No Lab 3 feature or test is claimed complete.

Source: CPE 334 Lab 3 handout, "TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens", 18 pages. This contract interprets the handout; explicit exclusions take precedence over extra controls in its illustrative screenshots.

Baseline: completed Lab 2 `main` at `f124c72`. Lab 3 work is isolated from unfinished local Lab 2 report edits.

## 1. Sprint Goal

Replace temporary requester selection with authenticated accounts and backend authorization, preserve existing Requester tickets and attachments, deliver the first operational IT Staff queue and ticket workflow, and provide small, usable Administrator account-management screens in the existing Zen Green design language.

## 2. Stakeholder Request

Requesters sign in and continue managing their own reports. IT Staff find, accept, prioritize, discuss, and progress tickets. Administrators maintain one-role user accounts and initial passwords. Initial-password users must choose a new password before accessing application data. Public conversation and private operational notes remain clearly separated in both UI and API.

## 3. Scope

Included: login/logout/current user/password change; role-specific navigation; server-side identity, role and ownership checks; data migration and local seed; Requester regression and resolution indication; staff queue/detail/assignment/priority/status; append-only comments and notes; minimal user administration; traceable tests, responsive/visual review and course evidence.

Excluded: registration, invitations, password-reset email, MFA, social login/SSO, Actions Taken/Service Actions, SLA/escalation/notifications, analytics beyond queue counts, production hosting changes, multiple roles per user, user deletion/bulk/import/export, departments/profile photos/account history, unlock/approval workflows. Admin list pagination, multi-column sorting and multiple simultaneous filters are not required. No new inline attachment preview.

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | Authenticate active users by email/password and return only safe current-user data. |
| FR-02 | Gate initial-password sessions until successful password change; support logout and session expiration. |
| FR-03 | Display current name/role and only permitted navigation; clear protected client data on identity change or session loss. |
| FR-04 | Enforce role and requester ownership at every protected backend operation, including direct attachment requests. |
| FR-05 | Migrate RequesterUser into User without losing IDs, tickets, attachment history/bytes or creation-idempotency relationships. |
| FR-06 | Continue Lab 2 create/list/detail and attachment validation/download/soft-removal behavior through authenticated Requester identity. |
| FR-07 | Provide staff queue search, filters, deterministic sorting, pagination and assigned/unassigned information. |
| FR-08 | Provide role-authorized staff detail and safe attachment metadata/download continuity. |
| FR-09 | Permit IT Staff to claim, assign/reassign and clear a ticket owner, subject to active eligible-user checks and conflicts. |
| FR-10 | Initialize IT Priority from Requested Priority; permit operational updates without changing the requested value. |
| FR-11 | Enforce the documented eight-status transition matrix, owner preconditions and confirmations. |
| FR-12 | Let an owning Requester append public comments and indicate apparent resolution without formally resolving/closing. |
| FR-13 | Let IT Staff append public comments/internal notes; return notes only to IT Staff and Administrator. |
| FR-14 | Provide Administrator user list, name/email search, optional single-role filter, create and edit. |
| FR-15 | Support activation/deactivation and new initial passwords; enforce unique emails, one role, self-deactivation and last-admin safety. |
| FR-16 | Deliver reusable Zen Green screens, usable desktop/tablet/mobile layouts, accessible controls and meaningful feedback. |
| FR-17 | Provide safe validation, forbidden/not-found/conflict/failure responses without disclosing private records or credentials. |
| FR-18 | Maintain AC-to-test traceability, migration/regression evidence, peer review, AI-use records and final-main submission evidence. |

## 5. Business Rules

### Authentication and identity

- **BR-01:** Only active users with valid credentials authenticate. Wrong passwords, unknown emails and inactive accounts share `401 INVALID_CREDENTIALS` and the message "Unable to sign in. Check your credentials or contact your administrator." Do not reveal which condition occurred.
- **BR-02:** `mustChangePassword=true` allows only current user, CSRF retrieval, password change and logout. All other application APIs return `403 PASSWORD_CHANGE_REQUIRED`; frontend routing alone is insufficient.
- **BR-03:** Identity comes from the server session. Ignore `X-Requester-Id` entirely; never fall back to it. Reject client-supplied identity/system fields in mutation bodies. Requester list/detail queries always constrain by the authenticated ID.
- **BR-04:** Public Comments are visible to the owning Requester, IT Staff and Administrator. Internal Notes are visible only to IT Staff and Administrator. A Requester's DTO never contains notes, note counts or note snippets.
- **BR-05:** Apparent resolution is an owning Requester's indication only; it does not change status or assign responsibility. Only IT Staff formally resolve/close in this contract.
- **BR-06:** Every user has exactly one role: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`. No implied role hierarchy; the matrix below is authoritative.
- **BR-07:** Email is trimmed and lowercased before validation/storage/lookup, at most 254 characters, with a valid local part and domain; no provider-specific dot/plus rewriting. Database uniqueness is authoritative. Name is trimmed Unicode NFC, 1-100 characters. Lengths in this contract use Unicode code points unless stated otherwise.
- **BR-08:** Initial/new passwords contain 15-128 characters and at most 512 UTF-8 bytes, with no trimming, silent normalization, composition rules or truncation. Reject all-whitespace values; accept spaces, Unicode and pasted passphrases. Confirmation must match exactly; the new password must differ from the current password. These are project decisions, not exact handout limits.
- **BR-09:** Use asynchronous Node `crypto.scrypt`, random salt of at least 16 bytes, 64-byte derived key, `N=131072`, `r=8`, `p=1`, and `maxmem=256 MiB`; store a versioned parameter/salt/hash string. Compare equal-length derived keys using `timingSafeEqual`. Bound concurrent hashing to two jobs; do not weaken costs in production code for tests. Passwords/hash strings never enter logs, DTOs or URLs.
- **BR-10:** Use database-backed opaque sessions: 32 random bytes in a host-only HttpOnly cookie, only its SHA-256 digest in the database. Absolute lifetime is 8 hours (15 minutes for initial-password sessions), with no sliding renewal. Rotate token after login and successful password change. Logout revokes server state and clears cookie. All user sessions are revoked on password reset/change, role change or activation change; a successful self password change receives one new session. Re-read user state on every request.
- **BR-11:** Cookie/CORS/CSRF behavior is fixed in api-spec.md. No session token or password in local/session storage. On logout/401/account change, clear ticket/attachment/queue/user caches, pending creation keys and legacy `toktickit.requester` state. Never auto-replay a failed mutation after signing in.
- **BR-12:** In the single-process local lab server, enforce 5 failed logins per normalized email and 30 failed logins per client IP per fixed 15-minute window; the next attempt returns `429` and `Retry-After` until expiry. Unknown/inactive users count identically. Use a dummy password hash for credential comparisons of unknown users. Limit password-change attempts to 5 failures per session per 15 minutes. Bound and expire limiter entries; restart resets these local counters, not sessions. No permanent lock/unlock feature.

### Ticket access and workflow

- **BR-13:** `requesterId` is immutable historical authorship. Ticket owner is a separate nullable `ownerId`. Eligible new owners are active IT Staff or Administrators. Admin eligibility does not grant operational permissions.
- **BR-14:** IT Staff may operate any ticket, including a ticket assigned to another eligible user. Claim succeeds only when unassigned; a competing claim returns `409 TICKET_CONFLICT`. Reassignment and clearing ownership require explicit confirmation. Clearing an owner is permitted only in NEW, OPEN or REOPENED.
- **BR-15:** Preserve `requestedPriority`; initialize/backfill `itPriority` from it and make IT Priority non-null. IT Staff can set LOW/MEDIUM/HIGH on non-terminal tickets. Administrator can also update IT Priority as the handout expressly permits, but has no other ticket mutation rights in this project's matrix.
- **BR-16:** Each ticket has an integer `version`, initially 1. Assignment, priority, status and resolution-indication mutations require `expectedVersion` and atomically increment it plus `updatedAt`. Mismatches return `409 TICKET_CONFLICT` without overwriting. Comment/note appends update `updatedAt` but not this operational version, so concurrent conversation does not unnecessarily block operations.
- **BR-17:** Status updates follow the matrix below. Same-status writes and unlisted transitions are invalid. An active eligible owner is required on entry into IN_PROGRESS, WAITING_FOR_REQUESTER or RESOLVED. CLOSED requires a prior RESOLVED status. Actions Taken is not a prerequisite in Lab 3.
- **BR-18:** Requester resolution indication is allowed in OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER and REOPENED. Store `requesterResolvedAt` using server time. Repeating the indication at the current version returns the existing result without incrementing version; a stale version still conflicts. Reset the indication when a ticket becomes REOPENED. No separate custom status is created.
- **BR-19:** CLOSED and CANCELLED tickets are read-only for assignment, priority, resolution indication and conversation. Reopening CLOSED is the one permitted exception; CANCELLED is terminal. RESOLVED still accepts conversation, assignment and priority, but its owner cannot be cleared.
- **BR-20:** Requesters retain Lab 2 attachment upload/download/soft-removal rules on owned tickets, including historical/terminal tickets. IT Staff and Admin can read/download permitted existing attachments on any ticket, but cannot upload/remove them. Removed/unavailable bytes remain inaccessible. Existing validation, safe filenames, limits, compensation and idempotent ticket creation remain in force.
- **BR-21:** Comments and notes are separate append-only resources. Content is Unicode NFC, CRLF-to-LF normalized and trimmed, 1-2,000 characters. Reject empty/blank/over-limit values and client author/time/visibility overrides. Render escaped plain text with line breaks; no HTML/Markdown execution. Each entry has UUID, ticket ID, author ID and server creation time. No edit/delete endpoints.
- **BR-22:** Conversation lists are oldest-first by `(createdAt,id)` with page/pageSize metadata. No cross-ticket leakage. A failed post retains text, disables duplicate clicks while pending and does not automatically retry an uncertain append; reload entries before the user chooses to retry.
- **BR-23:** Queue search matches number/summary/description; filters and sorting are defined in api-spec.md. Role and ownership authorization applies before returning totals, lookup data, record existence or validation details. Missing and non-owned Requester resources have the same safe 404 response.

### Administration and data preservation

- **BR-24:** Only Administrators list/search/create/edit users and set initial passwords. Create requires one role, active state and an initial password. Password issuance is manual in this local lab: admin enters and communicates it outside the app; the API never returns passwords. No email delivery.
- **BR-25:** Admin cannot deactivate their own account. No operation may deactivate or demote the last active Administrator. All admin create/edit/reset mutations serialize through one transaction-scoped database advisory lock, recheck actor authorization inside the transaction, check target version and invariants, then commit. Concurrent requests cannot leave zero active admins.
- **BR-26:** Prevent deactivation or role change away from IT_STAFF/ADMINISTRATOR for a user owning tickets outside CLOSED/CANCELLED (`409 USER_HAS_ACTIVE_TICKETS`). IT Staff must reassign those tickets first. Historical terminal assignments, requester authorship and comment/attachment authors remain preserved even after role/activity changes.
- **BR-27:** Admin edits use integer user `version` for optimistic concurrency. Increment it on account edit, password change or reset. Reset sets `mustChangePassword=true`, invalidates all sessions and never returns the new password/hash. Ordinary edits do not reset passwords. Admin self-demotion is allowed only when another active Admin remains and BR-26 permits it; it invalidates the current session.
- **BR-28:** Migration preserves IDs, existing email/name/timestamps, tickets, categories, systems, attachment metadata/bytes and idempotency records. Preflight normalized-email collisions; stop with an actionable non-secret report instead of merging/deleting users. No development-database reset.
- **BR-29:** Seed is local/test-only and idempotent: at least 4 active + 1 inactive Requesters, 3 active + 1 inactive IT Staff, and 1 active Admin. Use deterministic seed IDs, varied queue statuses/priorities/ownership and harmless conversation examples. Reruns do not reset existing passwords, reactivate users or overwrite user edits/tickets.
- **BR-30:** Automated migration/regression tests run only in an isolated guarded test database and upload directory. Test evidence reports actual commands, branch/commit, counts and results; pending or blocked checks never become Pass.

### Authorization matrix

All permissions require an active, non-expired, password-changed session, except the four restricted authentication operations. `Own` means `ticket.requesterId == session.userId`.

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Current user, CSRF, logout, password change | Yes, including restricted session | Same | Same |
| Active category/system references | Yes | Yes | Yes |
| Create ticket / My Tickets | Own | No | No |
| Requester detail | Own | No | No |
| Shared queue / staff detail | No | Yes | Read-only |
| Eligible owner lookup | No | Yes | No |
| Claim / assign / clear owner | No | Yes | No |
| Update IT Priority | No | Yes | Yes |
| Change status | No | Yes | No |
| Indicate apparent resolution | Own | No | No |
| Read Public Comments | Own | Any ticket | Any ticket |
| Append Public Comments | Own, non-terminal | Any non-terminal | No |
| Read Internal Notes | No | Any ticket | Any ticket |
| Append Internal Notes | No | Any non-terminal | No |
| Attachment metadata/download | Own | Any ticket | Any ticket |
| Attachment upload/soft-remove | Own, Lab 2 rules | No | No |
| User list/create/edit/reset | No | No | Yes |

Admin's landing page remains User Management. A secondary Ticket Lookup route exposes the narrow read/priority rights required by the handout; it does not show IT Staff claim/status/post actions. This resolves the handout's conceptual role separation and explicit Admin note/priority/owner permissions without granting all staff powers.

### Status transition matrix

Only IT Staff can execute the following. Values use API enum spelling; UI displays title-case labels. All require `expectedVersion`.

| From | Permitted next statuses |
|---|---|
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | REOPENED |
| REOPENED | OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED |
| CANCELLED | None |

Targets RESOLVED, CLOSED, REOPENED and CANCELLED require a confirmation dialog and `confirmed=true`; there is no required resolution-summary/Actions Taken field. Claim and assignment do not automatically change status. All nonlisted role/state combinations are denied.

## 6. UI Summary

The complete screen contract, dimensions, components, states and visual checklist are in [ui-spec.md](./ui-spec.md). The user explicitly requested polished UI that matches the assignment. Visual consistency and usable states are acceptance requirements. Avoid reproducing excluded screenshot controls such as reset-email, Service Actions or unnecessary admin pagination.

## 7. Data Model and Migration

| Model | Required increment |
|---|---|
| User | Evolve/rename RequesterUser, preserving UUIDs and timestamps; normalized unique email, name, role, isActive, passwordHash, mustChangePassword, version=1. Existing users default REQUESTER. |
| AuthSession | UUID, unique tokenHash, userId FK, csrfToken (32 random bytes encoded), createdAt, expiresAt. No raw session token. Index userId and expiresAt; FK restricts user deletion. |
| Ticket | Preserve fields/FKs and creation records; add nullable ownerId -> User, version=1, nullable requesterResolvedAt; make itPriority required after backfill; expand TicketStatus enum. |
| PublicComment / InternalNote | Separate models with UUID, ticketId, authorId, content, createdAt; index `(ticketId,createdAt,id)`; restrictive FKs. |
| Attachment / TicketCreateRequest | Retarget User relations while preserving original IDs and physical columns, including uploadedByRequesterId/removedByRequesterId; legacy names remain internal history. |

Queue indexes: retain Lab 2 requester indexes; add `(currentStatus,updatedAt)`, `(ownerId,updatedAt)` and `(itPriority,updatedAt)`. User email unique index is authoritative; no broad text-search infrastructure needed for the lab dataset.

Migration sequence: (1) back up development database/private files and record row counts/relationships; (2) preflight normalized emails; (3) rename table and preserve FKs, add schema fields/models/enums; (4) backfill normalized email, REQUESTER, versions, IT Priority; (5) run an idempotent initialization script for users with missing hashes, consuming an ignored local JSON map of user ID to initial password; validate every target/password and hash before a transaction, set mustChangePassword, never print passwords; (6) verify no missing hashes, apply NOT NULL and unique constraints; (7) run safe seed, reconcile counts/IDs/attachment checksums and ownership. An interrupted run safely resumes; no login is served during the maintenance migration. The input map is deleted by its owner after secure local distribution. Test fixtures use synthetic credentials only.

Existing seed/test consumers are updated to User explicitly. Lab 2 tests of selector/header semantics are replaced with authentication tests; the behavior they previously protected is retained in migrated regression tests. Legacy `GET /api/requesters` is removed (404); legacy UI `/select-requester` redirects to login without returning the user directory.

## 8. API Contract

Foundation implementation refinement for peer review: the migration sequence in section 7 now enforces a non-null `passwordHash` immediately, using a non-verifiable `!INITIAL_PASSWORD_REQUIRED` marker until the same private-map initializer completes. No default credential is embedded in the migration; maintenance continues until all markers are replaced. AuthSession also stores `userVersion` to invalidate stale sessions on account changes. Rationale, actual regression coverage and remaining rollout checks are in [foundation.md](foundation.md). This refines the intermediate schema mechanics without relaxing credential initialization or data-preservation requirements.

See [api-spec.md](./api-spec.md) for exact routes, body/response shapes, cookies, CSRF, limits, query handling and safe errors. Lab 2 APIs retain their resource shapes except explicit authenticated identity, non-null IT Priority and additive workflow fields.

## 9. Acceptance Criteria

| ID | Observable acceptance criterion |
|---|---|
| AC-01 | Active valid login sets the session cookie and safe role/user response; unknown, wrong-password and inactive attempts have indistinguishable 401 bodies. |
| AC-02 | Initial-password login permits only auth operations; direct application API access fails until valid change rotates the session and permits the role landing page. |
| AC-03 | Password boundary/confirmation/current-password checks and failed-attempt limits reject invalid inputs safely without plaintext storage or logs. |
| AC-04 | Logout, expiry, reset, role/activity changes invalidate old sessions; refresh/back navigation displays no cached protected data; CSRF/origin violations fail. |
| AC-05 | Every role/operation in the authorization matrix is exercised directly; forged requester IDs never change identity and ownership failures do not disclose existence. |
| AC-06 | Migration preserves Ticket/Attachment/CreateRequest IDs, authorship, bytes and relationships, backfills priority and initializes mandatory-change credentials; collisions stop migration safely. |
| AC-07 | Repeated seed runs preserve edits/passwords and satisfy minimum active/inactive roles plus realistic tickets/conversation. |
| AC-08 | Authenticated Requester creates tickets with the existing validation/idempotency behavior, searches only own records and sees no selector or client-derived identity. |
| AC-09 | Owned attachment upload/download/soft-removal, limits, unavailable/removed states and compensation continue; staff/admin get safe read access only. |
| AC-10 | Queue returns the documented search/filter/rank/sort/page subset and metadata; invalid queries fail; empty and no-results differ. |
| AC-11 | Staff detail presents complete historical data, active/removed attachment states and permitted controls; Admin detail exposes only read and IT Priority rights. |
| AC-12 | Claim/reassignment/clear-owner enforce eligible accounts/state/version; concurrent claim produces one winner and one safe conflict. |
| AC-13 | New/migrated IT Priority equals Requested Priority initially; only Staff/Admin can change IT Priority and the requested value remains unchanged. |
| AC-14 | Every allowed and disallowed status edge, owner precondition, same-state rejection, terminal rule and confirmation is tested; stale updates never overwrite. |
| AC-15 | Owning Requester indicates apparent resolution only in allowed states; status is unchanged, duplicates do not duplicate state, and reopen clears the indication. |
| AC-16 | Public Comments validate and append with server author/time, deterministic pagination and safe plain-text rendering; non-owner and terminal writes fail. |
| AC-17 | Internal Notes never appear in Requester payloads/counts/navigation; direct reads/writes are denied; Staff can append and Admin can read only. |
| AC-18 | Admin list/search/role filter and create/edit work with exactly one valid role, normalized unique email and documented field errors. |
| AC-19 | Admin initial-password reset invalidates sessions and requires change at next login without sending/returning email or plaintext secrets. |
| AC-20 | Self-deactivation, removing last active Admin, assigned-user deactivation/demotion and stale edits are blocked, including concurrent requests. |
| AC-21 | Login, password change, Requester detail, queue, staff detail and admin screens provide busy/validation/success/empty/no-results/forbidden/not-found/conflict/safe-failure feedback where meaningful. |
| AC-22 | Major screens pass desktop/tablet/mobile visual review with consistent tokens, readable hierarchy, distinct notes/comments and no clipping/overlap/page overflow. |
| AC-23 | Keyboard navigation, labels, error focus/announcements, dialog focus restoration, touch targets and non-color status communication work. |
| AC-24 | Unit/API/UI/regression/E2E results, screenshots, review history and AC mappings are captured honestly from final main and linked in the nine-part submission. |

Each AC maps to planned tests in [tests.md](./tests.md); planned filenames are not yet evidence of implemented tests.

## 10. Definition of Done

- [ ] Reviewed contract is internally consistent; all FR/BR/AC items are implemented or explicitly revised with rationale and peer review.
- [ ] Migration preserves development data and is demonstrated on isolated existing-Lab-2 fixtures; seed is repeatable without resetting accounts.
- [ ] Authentication, direct API authorization, requester regression, staff operations and minimal administration meet this contract.
- [ ] All planned relevant tests pass with no required skipped/disabled tests; failures are fixed rather than hidden by weakening assertions.
- [ ] Both production builds and final-main unit/API/UI/regression/E2E checks pass; commands/commit/results are recorded.
- [ ] Desktop/tablet/mobile screenshots and completed human visual checklist demonstrate the requested UI quality and accessibility.
- [ ] README setup/migration/initial-password distribution/test/build instructions and .gitignore are correct; no secrets/local uploads/generated noise in Git.
- [ ] Six Issues use the existing Backlog -> Specified -> Started -> PR Review -> Fixing -> Done workflow as appropriate; each PR has its formal Development-panel issue link.
- [ ] Feature PRs 1-5 target lab3-staging; approving peer reviewer merges after a real review. Issue 6 uses the release PR from lab3-staging to main, avoiding a seventh planned review round.
- [ ] reviewer.md records real reviewed commits, feedback, responses, approvals and merges. Do not invent approval or send review requests without the user's authorization.
- [ ] ai-use.md grows to 6-10 real selected prompts and a student-authored reflection. Initial log is intentionally incomplete.
- [ ] Submission is one concise PDF, Answer Part 1 through Answer Part 9 in order, working links/readable screenshots; final main is authoritative.

## 11. Decisions and Review Boundaries

This draft chooses session cookies over client-stored bearer tokens for straightforward revocation and current-role checks in the existing Express/PostgreSQL app. Scrypt is available in the existing Node runtime; its parameters follow the fallback guidance in the [OWASP password storage cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) and the [Node crypto API](https://nodejs.org/api/crypto.html). Cookie/session and CSRF decisions use the [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), consulted 2026-09-08. These references inform implementation decisions; they do not add excluded identity-management features.

Before implementation, peer review should specifically check Admin's narrow ticket permissions, status transitions/owner requirements, terminal conversation versus attachment behavior, 15-character passphrases, session revocation, initial-password migration and assigned-user deactivation rules. These are explicit project decisions rather than unstated assumptions.

The six-work-item dependency plan and submission mapping are in [issue-plan.md](./issue-plan.md). Runtime feature implementation begins after the engineering contract's review; this draft is a reviewable work product, not a completed application.
