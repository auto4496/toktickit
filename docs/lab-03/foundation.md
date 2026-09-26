# Authentication and Requester Foundation — Issue #26

This increment replaces the Lab 2 requester selector with server sessions. It includes Login, mandatory initial-password change, Logout, role navigation, authenticated Requester tickets and attachments, and the User/session/ticket schema needed by later increments. Staff workflow and Administrator management remain Issues #27 and #28; their landing screens identify the pending work rather than exposing unsupported controls.

## Local setup and existing data

Keep the application stopped while migrating an existing Lab 2 database. Back up its PostgreSQL data and configured attachment directory first. Do not use `migrate reset`, Docker factory reset, or seed to repair a migration error. Generate Prisma, apply the checked-in migrations using `prisma migrate deploy`, initialize existing accounts, and then run seed. The development database has not been migrated by this implementation task; migration verification uses a separate guarded test database.

For existing RequesterUser rows, prepare an ignored file ending in `.initial-passwords.json`. Its JSON object maps each existing user UUID to a unique initial passphrase (15–128 Unicode characters, at most 512 UTF-8 bytes). Run from the repository root:

```powershell
npm --prefix server run prisma:initialize-passwords -- "C:\private\accounts.initial-passwords.json"
```

The initializer validates all pending accounts before hashing, then updates them in one transaction. It does not print credentials; re-running it leaves already initialized accounts unchanged. Distribute each initial password privately and remove the input file after distribution. Do not paste real passwords into issues, chat logs, screenshots, or commits.

Implementation refinement for review: migration immediately requires `passwordHash` and backfills the deliberately non-verifiable `!INITIAL_PASSWORD_REQUIRED` sentinel, instead of leaving a nullable field between two migrations. The default is removed immediately. Login cannot authenticate a sentinel; the initializer replaces only sentinel values. Maintenance remains in effect until all accounts are initialized. This avoids serving a mixed nullable schema and preserves the contract's fail-closed and resumable behavior. Session records also store `userVersion`; every request compares it with the current User, so version changes invalidate old sessions even before cleanup.

Seed is local/test-only. New sample accounts use the synthetic initial passphrase `Local lab green garden 2026` and require a personal replacement on first login. Requester examples include `jennifer.anderson@example.com`; Staff `alex.staff@example.test`; Administrator `admin@example.test`. Existing accounts and password hashes are never reset by seed. Samples contain four active and one inactive Requesters, three active and one inactive Staff, one Admin, eight ticket statuses and harmless public/private conversation records. Conversation UI and operational mutations arrive with #27.

## Runtime behavior

`CLIENT_ORIGIN` is an exact origin (default `http://localhost:3000`). Use one hostname consistently in the browser. Only loopback HTTP is accepted for development/test; production requires HTTPS. CORS allows that origin with credentials. The host-only HttpOnly SameSite=Lax cookie becomes Secure on HTTPS. No authentication state is taken from `X-Requester-Id` or browser storage. `/api/requesters` returns 404.

Passwords use asynchronous scrypt N=131072/r=8/p=1, independent 16-byte salts, and a 64-byte result. Hash work has two active slots and a bounded queue. Opaque 32-byte session tokens are stored only as SHA-256 digests. Sessions last eight hours or 15 minutes for initial-password accounts. Password change rotates the current session and revokes all previous sessions. Login failures use a bounded in-memory per-email/per-IP limiter; the limiter and pre-auth CSRF store are appropriate to this single-process lab deployment.

Mutations require an exact Origin and CSRF header bound to the pre-auth cookie or authenticated session. A restricted session can only access me/CSRF/password-change/logout. Requester ownership is enforced server-side; another user's resource and a missing resource have the same 404. Staff/Admin attachment access is read-only in this increment. Unknown ticket mutation fields are rejected and new IT Priority copies Requested Priority.

## Regression changes and evidence boundary

The obsolete `client/tests/lab-01/App.test.tsx` system-check UI and `client/tests/lab-02/RequesterSelection.test.tsx` are replaced by `client/tests/lab-03/ApplicationShell.test.tsx`. Public health API tests remain. Requester-context tests now check session identity/role and forged-header rejection. Existing Ticket and Attachment suites remain in `lab-02` with real session cookies and CSRF fixture headers; they exercise the actual session middleware, while `auth.api.test.ts` exercises real password verification/login/rotation. Existing browser journeys now sign in and log out instead of selecting a requester. E2E fixture credentials are synthetic and confined to the guarded test database.

Migration tests create randomly named schemas only in a test-marked database, apply the historical Lab 1/Lab 2 migrations, populate old records, and apply Lab 3. They check IDs, timestamps, attachment metadata, idempotency hashes, relational reads, initial priority, collision rollback and resumable password initialization. These tests do not claim a checksum comparison of the user's real attachment directory or a completed development-data rollout.

Unit/API/UI and migration verification reached 187 passing tests before the final authorization/error cases were added. The final focused auth/authorization/attachment run passed 24 cases, including ten additional cases. Both production builds passed. The first browser run passed six of seven cases; a development-server restart during concurrent editing interrupted one login. The subsequent frozen-source run, including the new initial-password journey, passed all eight cases. Selected visual evidence and actual command results are recorded in tests.md. Full-system/final-main evidence remains reserved for #29/#30.
