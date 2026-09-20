# Administrator user management — Issue #28

Branch: `codex/lab3-4-user-administration`, based on the approved staff-workflow merge `f13469cdbbcb3da6459409ae14ae58dc8b3ef034`. Target: `lab3-staging`.

Review: [PR #34](https://github.com/auto4496/toktickit/pull/34), formally linked to [Issue #28](https://github.com/auto4496/toktickit/issues/28). Implementation/evidence commit: `25776f3`; peer approval and merge remain pending.

## Delivered behavior

Administrators can search names/emails, filter by role, create accounts, edit complete account details, activate/deactivate accounts, and set a new initial password. Each account has exactly one role. Desktop uses a directory table and side form; tablet/mobile use account cards and a full-width form. There is no account deletion, bulk editing, public registration, or email-reset flow.

The server normalizes names to trimmed NFC and emails to trimmed lowercase, enforces database uniqueness, hashes initial passwords with the existing real scrypt implementation, and returns only SafeUser fields. Initial credentials must be changed at first sign-in. Password reset revokes every existing session; self-reset and self-role changes also clear the cookie and explain the return to login.

Self-deactivation is prohibited. Role/activity changes cannot remove the last active administrator or leave unfinished tickets assigned to an ineligible owner. RESOLVED still counts as unfinished; CLOSED/CANCELLED retain historical owners. Reassign unfinished work before deactivating or demoting its owner.

## Concurrency and session decisions

Every account mutation acquires the same PostgreSQL advisory transaction lock `(334, 3)` used by ticket owner/status operations. It then locks/rechecks the acting administrator and session, locks the target User row, and checks the target version and invariants before committing. User row locks also serialize with login and personal password changes. Password hashing occurs outside the transaction; the snapshot version is checked again inside it.

Every successful edit increments the user version. Role/activity changes and password resets delete sessions. Name/email-only edits preserve existing sessions by updating their userVersion under the same row lock; their original expiry and token remain unchanged. This preserves ordinary editing while keeping security changes immediately revocable.

A stale form receives USER_CONFLICT. The UI retains the draft, disables saving, loads the current account, and requires an explicit choice to keep the draft against the reviewed version or use current values, followed by a separate Save action. It never automatically retries account mutations. Closing a dirty form asks for discard confirmation; password drafts clear on cancel/unmount. Reset dialogs use native modal focus containment, Escape handling, and opener focus restoration.

## Verification mapping

| Contract | Evidence |
|---|---|
| API-12–14, relevant API-04/05 | `server/tests/lab-03/admin-users.api.test.ts`: 25 real database/API cases covering authorization/CSRF/initial gate, safe shapes/search/validation, duplicate email races, version races, session lifecycle, last-admin concurrency, assigned-owner safety, and claim/assign/start/resolve racing account changes |
| UI-08, relevant UI-01/02 | `client/tests/lab-03/UserManagement.test.tsx`: six form/filter/error/conflict/discard/self-reset cases; existing shell and authentication cases retained |
| E2E-03 | `e2e/lab-03/admin-users.spec.ts`: create → edit → reset → initial-password login/change → Staff landing and direct Admin denial |
| Responsive/visual | Directory, editor and reset dialog at 1440, 834, 390 and 320 widths, including overflow checks |

Execution results and initial failures are recorded in `tests.md`. Agent testing is not independent peer approval. Final-system verification and release remain separate work items #29/#30.
