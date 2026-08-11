# Lab 1 - Test Record

Every automated test listed below exists in a `tests/lab-01/` folder.

## Automated Tests

| Test ID | Test file | Tool | Test description | Issue |
|---|---|---|---|---|
| API-00 | `server/tests/lab-01/server.test.ts` | Vitest + Supertest | `GET /` returns HTTP 200, `status: ok`, and the TokTickIT backend message | Issue 1 |
| API-01 | `server/tests/lab-01/health.test.ts` | Vitest + Supertest | `GET /api/health` returns HTTP 200 and the exact health JSON | Issue 2 |
| API-02 | `server/tests/lab-01/categories.test.ts` | Vitest + Supertest | `GET /api/categories` returns the four seeded categories in ID order | Issue 4 |
| UI-01 | `client/tests/lab-01/App.test.tsx` | Vitest + Testing Library | The TokTickIT heading renders | Issue 4 |
| UI-02 | `client/tests/lab-01/App.test.tsx` | Vitest + Testing Library | Loading changes to Online status and the API-provided category list | Issue 4 |
| UI-03 | `client/tests/lab-01/App.test.tsx` | Vitest + Testing Library | An API failure displays Offline status and a useful error message | Issue 4 |

## Automated Test Command

Run from the repository root:

```text
npm test
```

Record the final passing terminal output here after executing the complete suite on the finished branch and again on `main`.

## Database and Build Verification

| Verification | Expected result |
|---|---|
| `npm run prisma:generate` from `server/` | Prisma Client is generated using the root `.env` |
| `npm run prisma:migrate` from `server/` | Migration applies and the schema is up to date |
| Run `npm run prisma:seed` twice | Both runs finish without duplicate categories |
| Count Category rows and distinct names | 4 rows and 4 distinct names |
| `npm run build:server` from repository root | Express TypeScript build succeeds |
| `npm run build:client` from repository root | React/Vite production build succeeds |
