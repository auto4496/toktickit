# Corrected final-main test database setup

This post-merge runbook addresses Datakung's non-blocking [PR #36 documentation comment](https://github.com/auto4496/toktickit/pull/36#discussion_r4111152609). Prisma generation creates the client code; it does not create database tables. A new unit/API test database must have the committed migrations applied before npm test.

Use the [repository test setup](https://github.com/auto4496/toktickit/blob/b3a65949f3fad3c84ffabbe01707db0d929686f0/README.md#tests-and-builds) and [.env.test.example](https://github.com/auto4496/toktickit/blob/b3a65949f3fad3c84ffabbe01707db0d929686f0/.env.test.example). Create separate, fresh PostgreSQL databases for unit/API tests and browsers. The name must contain a distinct test marker. Never substitute a development or production database.

From the clean main checkout, install the locked root, server and client dependencies, then generate Prisma. Set TEST_DATABASE_URL to the newly created unit/API test database using its local test-only credentials. Keep secrets out of committed files and reports.

```powershell
npm ci
npm --prefix server ci
npm --prefix client ci
npm run prisma:generate

# TEST_DATABASE_URL must already identify the fresh isolated unit/API database.
# Preserve any original development URL, and expose the test URL only to migration.
$previousDatabaseUrl = $env:DATABASE_URL
try {
    $env:DATABASE_URL = $env:TEST_DATABASE_URL
    npx --no-install prisma migrate deploy --schema=server/prisma/schema.prisma
    if ($LASTEXITCODE -ne 0) { throw 'Test database migration failed.' }
} finally {
    if ($null -eq $previousDatabaseUrl) {
        Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    } else {
        $env:DATABASE_URL = $previousDatabaseUrl
    }
}
npm test
if ($LASTEXITCODE -ne 0) { throw 'Unit/API/UI suite failed; retain the output.' }

# Set TEST_DATABASE_URL to the separate fresh browser test database before continuing.
$env:E2E_CLIENT_PORT = '3500'
$env:E2E_API_PORT = '5500'
npm run test:e2e:capture:lab3
if ($LASTEXITCODE -ne 0) { throw 'Browser suite failed; retain the output.' }
npm run build:server
if ($LASTEXITCODE -ne 0) { throw 'Server build failed.' }
npm run build:client
if ($LASTEXITCODE -ne 0) { throw 'Client build failed.' }
git diff --check
```

The browser suite's existing global setup deploys migrations and seeds its guarded test database. Run the two suites and builds sequentially. Record the exact source SHA, starting tracked status, command output, exit code and screenshot hashes; retain failed/interrupted attempts rather than replacing them with a later summary.

The capture script in this main version has a historical staging note. After capture, annotate the evidence record with the actual main SHA and run time while preserving the script's original manifest as raw output. Changing a label does not substitute for running the suite on main.
