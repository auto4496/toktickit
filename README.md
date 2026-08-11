# TokTickIT - Lab 01

TokTickIT is the Lab 1 full-stack starter for an IT service desk. The current implementation through Issue 3 includes a React/Vite/Bootstrap client, an Express/TypeScript API, a PostgreSQL database through Prisma, the health-check feature, and repeatable seed data for four IT request categories.

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

The health endpoint returns:

```json
{
  "status": "ok",
  "service": "TokTickIT API"
}
```

## Tests and Builds

Run all currently implemented automated tests:

```bash
npm test
```

Build both applications:

```bash
npm run build:server
npm run build:client
```

The current frontend displays the Issue 2 health-check state. The category API and category-list UI are intentionally deferred to Issue 4.
