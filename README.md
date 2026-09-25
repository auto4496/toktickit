# TokTickIT - Lab 3 Service Desk

TokTickIT is an IT service-desk application with session authentication, Requester tickets and attachments, an IT Staff queue and workflow, and Administrator account management. See [foundation setup and migration](docs/lab-03/foundation.md) before upgrading an existing Lab 2 database, [staff workflow](docs/lab-03/staff-workflow.md), and [user management](docs/lab-03/user-management.md). Integrated verification in [Issue #29](https://github.com/auto4496/toktickit/issues/29) is peer-approved and merged. The [release checklist and review-report command](docs/lab-03/release.md) track [Issue #30](https://github.com/auto4496/toktickit/issues/30), including the remaining final-main checks and submission PDF.

| Role | Main screens | Responsibilities |
|---|---|---|
| Requester | `/tickets`, `/tickets/new`, `/tickets/:id` | Own tickets, attachments, public comments and resolution indication |
| IT Staff | `/staff/tickets`, `/staff/tickets/:id` | Search/filter queue, claim/assign, priority/status, public comments and private notes |
| Administrator | `/admin/users`, `/staff/tickets` | Create/edit/reset accounts; read ticket conversations and change IT Priority |

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
│   │   └── lab-03/
│   └── package.json
├── e2e/
│   ├── lab-02/
│   └── lab-03/
├── artifacts/
│   ├── lab-02/screenshots/
│   └── lab-03/screenshots/
├── docs/
│   ├── lab-01/
│   ├── lab-02/
│   └── lab-03/
├── .env.example
├── .gitignore
├── package.json
├── playwright.config.ts
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

For existing Lab 2 data, complete the private account initialization in [the migration guide](docs/lab-03/foundation.md) before restarting the application. Seed is idempotent and preserves existing edits/passwords. It includes accounts, sample Tickets/conversations and these category names:

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
npm run test:e2e:lab3
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

`test:e2e:lab3` includes the retained Lab 2 journeys plus authentication, Staff and Administrator workflows and cross-role system verification. `test:e2e` remains the Lab 2 subset. Override `E2E_CLIENT_PORT` and `E2E_API_PORT` if the defaults are already in use. Never run two suites against the same test database concurrently.

```bash
npm run test:e2e:capture:lab3
```

This explicit command runs the complete browser suite, then copies its Lab 3 screenshots to `artifacts/lab-03/screenshots/system/` only after success. A manifest records the capture time, Git baseline/working-tree state and PNG checksums. Routine runs write only to ignored `test-results/`. Synthetic failure/empty-state captures are labelled in filenames; they do not prove server behavior. Real HTTP/database tests provide that evidence separately.

See [system verification](docs/lab-03/system-verification.md), [test traceability](docs/lab-03/tests.md), [review history](docs/lab-03/reviewer.md), [AI use and reflection draft](docs/lab-03/ai-use.md), and the [nine-part submission draft](docs/lab-03/submission-draft.md). Historical run results are dated and are not final-main acceptance.
