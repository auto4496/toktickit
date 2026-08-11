# Lab 1 - Test Record

This record is current through Issue 3. Every automated test listed below exists under `server/tests/lab-01/`.

## Automated Tests

| Test ID | Test file | Tool | Test description | Introduced in | Latest result |
|---|---|---|---|---|---|
| API-00 | `server/tests/lab-01/server.test.ts` | Vitest + Supertest | `GET /` returns HTTP 200, `status: ok`, and the TokTickIT backend message | Issue 1 | Passed |
| API-01 | `server/tests/lab-01/health.test.ts` | Vitest + Supertest | `GET /api/health` returns HTTP 200 and the exact JSON `{ status: "ok", service: "TokTickIT API" }` | Issue 2 | Passed |

## Latest Automated Test Run

Command executed from the repository root:

```text
npm test

Test Files  2 passed (2)
Tests       2 passed (2)
```

## Issue 3 Database Verification

The following are verification commands rather than automated test files:

| Verification | Expected result | Result |
|---|---|---|
| `npm run prisma:generate` from `server/` | Prisma Client generated using the root `.env` | Passed |
| `npm run prisma:migrate` from `server/` | Migration applies and schema is up to date | Passed |
| Run `npm run prisma:seed` twice | Both runs finish without duplicate categories | Passed |
| Count Category rows and distinct names | 4 rows and 4 distinct names | Passed |
| `npm run build` from `server/` | TypeScript build succeeds | Passed |
| `npm run build:client` from repository root | React/Vite production build succeeds | Passed |

Issue 4 must extend this file with the category API test and required React UI tests after those test files have been implemented and executed.
