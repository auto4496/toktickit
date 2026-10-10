# TokTickIT - Lab 4 Service Desk

TokTickIT is an IT service-desk application with session authentication, Requester Tickets and attachments, Staff workflow, Administrator account management, audited Actions Taken and role dashboards. LAB4 feature work #38-46 is independently approved and merged into `codex/lab4-staging`. [Final hardening and release #48](https://github.com/auto4496/toktickit/issues/48) tracks regression, report preparation and the remaining reviewed staging-to-main release. See [LAB4 release checklist](docs/lab-04/release.md), [specification](docs/lab-04/specification.md), [API](docs/lab-04/api-spec.md), and [test results](docs/lab-04/tests.md).

| Role | Main screens | Responsibilities |
|---|---|---|
| Requester | `/dashboard`, `/tickets`, `/tickets/new`, `/tickets/:id` | Owned metrics, Tickets, attachments, public comments, read-only Actions and advisory resolution indication |
| IT Staff | `/staff/dashboard`, `/staff/tickets`, `/staff/tickets/:id` | Metrics, queue, owner/priority/status, conversations and Actions Taken |
| Administrator | `/admin/users`, `/staff/dashboard`, `/staff/tickets` | Accounts, operational dashboard, IT Priority and Actions; Ticket Owner/status changes remain Staff-only |

Initial-password accounts must change their password before using the application. There is no self-registration, email reset or account deletion. Authorization is enforced by the API as well as the interface.

## Technology Stack

- Frontend: React, TypeScript, Vite, Bootstrap
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL and Prisma
- Testing: Vitest, Supertest, React Testing Library, and Playwright

## Repository Structure

```text
toktickit/
├── client/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   ├── tests/
│   │   ├── lab-01/
│   │   ├── lab-02/
│   │   ├── lab-03/
│   │   └── lab-04/
│   └── package.json
├── e2e/
│   ├── lab-02/
│   ├── lab-03/
│   └── lab-04/
├── artifacts/
│   ├── lab-02/screenshots/
│   ├── lab-03/screenshots/
│   └── lab-04/release/
├── docs/
│   ├── lab-01/
│   ├── lab-02/
│   ├── lab-03/
│   └── lab-04/
├── scripts/lab-04/
├── .env.example
├── .gitignore
├── package.json
├── playwright.config.ts
├── playwright.release.config.ts
└── vitest.config.ts
```

## Prerequisites

- Node.js and npm
- PostgreSQL 17, either installed locally or running in Docker
- Git

## Installation

From the repository root, install the dependencies:

```bash
npm ci
npm --prefix client ci
npm --prefix server ci
```

Create the local environment file. Do not commit this file.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

The default template expects PostgreSQL at `localhost:5432`, database `toktickit_db`, username `postgres`, and password `postgres`. Adjust the local `.env` if your database configuration is different.

### Optional PostgreSQL Docker Container

If port 5432 is free, start a local PostgreSQL container with:

```bash
docker run --name toktickit-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=toktickit_db -p 5432:5432 -d postgres:17-alpine
```

For an existing stopped container, use:

```bash
docker start toktickit-postgres
```

## Database Setup

The Prisma scripts run from `server/` and explicitly load the repository-root `.env`.

```bash
cd server
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
cd ..
```

For existing Lab 2 data, complete the private account initialization in [the migration guide](docs/lab-03/foundation.md) before restarting the application. For Lab 3 upgrades, back up the database and attachment storage before applying the additive `20261004000000_lab4_actions` migration; follow [the tested migration/recovery procedure](docs/lab-04/data-foundation.md). Existing Tickets require no Action backfill, but new formal resolution requires completed documented work. Seed is idempotent, rejects production use and preserves existing edits/passwords/history. It includes all roles, varied Tickets/conversations, zero/one/multiple Actions, and these categories:

1. Account and Access
2. Hardware
3. Software
4. Network

## Run the Application

Open two terminals at the repository root.

Backend:

```bash
npm run dev:server
```

Frontend:

```bash
npm run dev:client
```

Default URLs:

- Frontend: `http://localhost:3000`
- Health endpoint: `http://localhost:5000/api/health`
- Category endpoint: `http://localhost:5000/api/categories`
- Create Ticket screen: `http://localhost:3000/tickets/new`
- Create Ticket endpoint: `POST http://localhost:5000/api/tickets`
- My Tickets screen: `http://localhost:3000/tickets`
- My Tickets endpoint: `GET http://localhost:5000/api/tickets`
- Ticket Detail endpoint: `GET http://localhost:5000/api/tickets/:ticketId`
- Attachment upload endpoint: `POST http://localhost:5000/api/tickets/:ticketId/attachments`
- Attachment metadata/download/removal endpoints: `/api/attachments/:attachmentId`

The health endpoint returns:

```json
{
  "status": "ok",
  "service": "TokTickIT API"
}
```

The category endpoint returns the seeded categories in ID order:

```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

Open `/login`, sign in with an active account and replace its initial password if prompted. Requesters can then use **Create Ticket** and **My Tickets**. Creation validates fields/files, prevents duplicate submissions with an idempotency key, and uploads attachments after saving the Ticket. My Tickets exposes only the signed-in Requester's records with filters, sorting, pagination, desktop tables and mobile cards. Ticket Detail preserves owned Attachment upload/download/soft-removal. Reference and Ticket endpoints now require a session; the health endpoint remains public.

## Tests and Builds

Automated tests require a separate PostgreSQL database or schema. Copy the test
template, edit it if necessary, and migrate that test-only target as documented
in [`docs/lab-02/tests.md`](docs/lab-02/tests.md):

```powershell
Copy-Item .env.test.example .env.test.local
```

Edit `.env.test.local` so `TEST_DATABASE_URL` points to a dedicated PostgreSQL database or schema whose name contains a distinct `test` marker. It must not match the development `DATABASE_URL`. Install the browser used by the reproducible E2E suite once:

```bash
npx playwright install chromium
```

Run all currently implemented automated tests. Vitest fails fast unless
`TEST_DATABASE_URL` clearly identifies a test-only target distinct from
`DATABASE_URL`:

```bash
npm test
npm run test:e2e:release
```

`npm run test:e2e` writes generated screenshots only under the ignored
`test-results/` directory. Refresh the curated Lab 2 evidence explicitly when
needed:

```bash
npm run test:e2e:capture
```

The Playwright setup validates the same test-only URL guard before it deploys migrations, seeds reference data idempotently, or clears only E2E-owned Ticket rows and their related Attachment and creation-request rows. It never uses the development database. The E2E suite runs the API and client on isolated ports `5100` and `3100`, checks desktop `1440x900`, tablet `834x1112`, and mobile `390x844`. Only `npm run test:e2e:capture` refreshes the curated screenshot evidence under `artifacts/lab-02/screenshots/`.

Build both applications:

```bash
npm run build:server
npm run build:client
```

`test:e2e:release` selects every browser spec from Labs 2-4, including the complete retained responsive/visual suite, auth, accounts, Staff operations, Actions, workflow and dashboards. `test:e2e` remains the Lab 2 subset. The release config allows 120 seconds for cold server startup while retaining per-test limits/readiness checks. Override `E2E_CLIENT_PORT` and `E2E_API_PORT` if needed. Run database suites sequentially.

```bash
npm run test:e2e:capture:lab3
```

This explicit command runs the complete browser suite, then copies its Lab 3 screenshots to `artifacts/lab-03/screenshots/system/` only after success. A manifest records the capture time, Git baseline/working-tree state and PNG checksums. Routine runs write only to ignored `test-results/`. Synthetic failure/empty-state captures are labelled in filenames; they do not prove server behavior. Real HTTP/database tests provide that evidence separately.

See [system verification](docs/lab-03/system-verification.md), [test traceability](docs/lab-03/tests.md), [review history](docs/lab-03/reviewer.md), [AI use and reflection draft](docs/lab-03/ai-use.md), and the [nine-part submission draft](docs/lab-03/submission-draft.md). Historical run results are dated and are not final-main acceptance.

## LAB4 verification and demonstration

Focused commands:

```bash
npm run test:e2e:actions
npm run test:e2e:workflow
npm run test:e2e:dashboards
npm run test:perf:dashboards
npm run test:e2e:capture:release
```

The last command runs the entire integrated browser suite and validates all 75 selected PNGs before refreshing `artifacts/lab-04/release/`. Routine runs write only ignored `test-results/`; they preserve curated evidence. The scale test creates and removes only its own guarded random test schema (5,000 Tickets / 10,000 Actions), checks exact metrics and bounded responses, and writes natural PostgreSQL query plans to ignored `tmp/dashboard-smoke.json`. It is a local smoke test, not a production load benchmark. Complete database recovery checks additionally require Docker and the dedicated PostgreSQL test container described in the recovery guide.

Demo sequence using privately provisioned or seeded development accounts:

1. Requester signs in, opens the Dashboard, follows an open/waiting card, creates a Ticket and uploads an attachment.
2. Staff opens the Dashboard and matching queue, claims the Ticket, sets IT Priority and moves it through Open to In Progress. Ticket Owner and Action assignee may differ.
3. Add multiple Actions: assign active Staff/Admin, enter date/time and description; a follow-up flag requires its note. Start, edit, complete with Result or cancel; verify the actor/revision history.
4. Confirm Resolve remains unavailable while Actions are unfinished or no documented completion exists. Complete work and Resolve; close/reopen retains Action history. Requester indication alone does not change Ticket status.
5. Requester reads shared Actions/comments/files; private notes and other Requesters' Tickets stay inaccessible. Admin demonstrates account creation/reset and its separate operational Dashboard without Staff-only status/owner controls.
6. Repeat at desktop/tablet/mobile, use keyboard links, and demonstrate empty/error/conflict recovery described in [UI specification](docs/lab-04/ui-spec.md).

Demo passwords are supplied privately through the existing seed/password-initialization process, never committed to the repository. The nine-part [submission draft](docs/lab-04/submission-draft.md), [current verification](docs/lab-04/final-verification.md), [peer review history](docs/lab-04/reviewer.md), and [AI use](docs/lab-04/ai-use.md) distinguish author checks from final-main acceptance.
