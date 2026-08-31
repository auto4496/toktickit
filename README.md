# TokTickIT - Lab 02 in progress

TokTickIT is an IT service-desk application. The current Lab 2 increment adds a Development Requester context and a complete Create Ticket workflow on top of the Lab 1 health/category foundation.

## Technology Stack

- Frontend: React, TypeScript, Vite, Bootstrap
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL and Prisma
- Testing: Vitest and Supertest

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
├── docs/
│   └── lab-01/
│       ├── ai_use.md
│       ├── db-evidence.md
│       ├── reviewer.md
│       └── tests.md
├── .env.example
├── .gitignore
├── package.json
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
npm run prisma:migrate
npm run prisma:seed
cd ..
```

The seed is idempotent and can be run repeatedly. It creates exactly these category names:

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

Select an active Development Requester, then open **Create Ticket**. The form loads active Category and Related System values, validates Ticket fields and optional file selection, prevents duplicate submissions with an idempotency key, and shows the server-issued Ticket Number after creation. This requester selection is a Lab 2 testing context, not authentication.

## Tests and Builds

Automated tests require a separate PostgreSQL database or schema. Copy the test
template, edit it if necessary, and migrate that test-only target as documented
in [`docs/lab-02/tests.md`](docs/lab-02/tests.md):

```powershell
Copy-Item .env.test.example .env.test.local
```

Run all currently implemented automated tests. Vitest fails fast unless
`TEST_DATABASE_URL` clearly identifies a test-only target distinct from
`DATABASE_URL`:

```bash
npm test
```

Build both applications:

```bash
npm run build:server
npm run build:client
```

The current suite covers the Lab 1 foundation plus test-database safety, seeded reference data, requester context, Ticket validation/number generation, sequential and concurrent idempotent creation, safe failures, and Create Ticket UI/responsive states.
