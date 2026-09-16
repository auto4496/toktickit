# TokTickIT - Lab 3 Authentication and Requester Foundation

TokTickIT is an IT service-desk application. Lab 3 adds secure login, sessions, the IT Staff queue and ticket workflow while preserving Requester Ticket and Attachment workflows. See [foundation setup and migration](docs/lab-03/foundation.md) before upgrading an existing Lab 2 database, and [staff workflow and verification](docs/lab-03/staff-workflow.md) for the current screens. Administrator user management is the next increment.

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
│   │   └── lab-01/
│   └── package.json
├── e2e/
│   └── lab-02/
├── artifacts/
│   └── lab-02/screenshots/
├── docs/
│   ├── lab-01/
│   └── lab-02/
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
npm run test:e2e
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

The complete suite covers the Lab 1 foundation, test-database safety, seeded reference data, requester context, Ticket validation/number generation, sequential and concurrent idempotent creation, owned list/query behavior, Ticket Detail, Attachment validation/storage/compensation, safe errors, responsive/accessibility styles, complete requester E2E journeys, and visual evidence.
