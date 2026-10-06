# Lab 4 Data Foundation and Recovery

Work item: [Issue #40](https://github.com/auto4496/toktickit/issues/40), approved by Datakung at `301c902` and integrated through [PR #41](https://github.com/auto4496/toktickit/pull/41) on 2026-10-06. Issue #40 is closed/Done. Contract: [approved/merged PR #39](https://github.com/auto4496/toktickit/pull/39). Branch: `codex/lab4-2-data-foundation`, based on staging merge `b5bee16`.

## Changes

- The additive `20261004000000_lab4_actions` migration creates ActionTaken, ActionRevision, ActionCreateRequest, lifecycle/operation enums, indexes and restrictive foreign keys inside a transaction. Existing Lab 1–3 records are retained.
- Deterministic synthetic seed Actions cover zero/one/multiple Actions per Ticket and PLANNED/IN_PROGRESS/COMPLETED states. Initial Action/revision creation is atomic. Reruns preserve existing Action fields, timestamps, versions and revision snapshots as well as existing user/Ticket edits. Production seeding is rejected before database access.
- INT-01 extends the retained Lab 2–3 migration suite rather than duplicating it. INT-02 adds a separate complete recovery scenario with two randomly named test databases and a shared `recovery_fixture` schema.

## Recovery procedure exercised

1. Guard the loopback test URL and confirm it maps to the dedicated `toktickit-lab3-test` container. Create distinct source and recovery databases; never restore into the shared test database or development database.
2. Apply Lab 1–3 migrations to the source. Create active/inactive users, owned/unowned Tickets across three statuses, public/internal history, an idempotency record, session and active/removed attachment metadata/files.
3. Snapshot every fixture table's complete records and constraint definitions/validation state. Take a custom-format `pg_dump` backup and copy attachment files separately. Store backup/file SHA-256 and byte lengths.
4. Apply the transactional Lab 4 migration; compare every pre-existing record/constraint and run Prisma schema diff with the same fixture datasource. Inject a disposable Action, making the legacy-baseline validation fail intentionally. Stop source writes.
5. Feed the saved archive into `pg_restore --exit-on-error --single-transaction` in the clean recovery database, then copy saved attachment files into its separate storage directory.
6. Compare complete recovered records/constraints, require zero Ticket orphans and no Lab 4 Action tables/types, and compare retained file paths, lengths and SHA-256. Exercise the real application/session/storage download path against the recovered database: active file returns identical bytes, removed file remains 404.
7. Disconnect and drop only the databases created by this run; verify generated-name guards and the temporary storage path before cleanup.

The format/tool pairing follows the [PostgreSQL pg_dump documentation](https://www.postgresql.org/docs/current/app-pgdump.html) and [pg_restore documentation](https://www.postgresql.org/docs/current/app-pgrestore.html). This is a disposable recovery exercise following controlled **validation** failure; it does not claim an accidental production failure or an operational production restore.

## Execution evidence

- INT-01: observed passing migration, collision, seed preservation and production-guard checks on 2026-10-05.
- INT-02: observed passing complete recovery, Prisma schema parity, records/constraints and attachment/download comparisons on 2026-10-05.
- Server production build: passed on this branch.
- Full Vitest regression: **37 files / 391 tests passed** in one uninterrupted run. After strengthening the complete-baseline and recovered-enum assertions, the final focused run passed **2 files / 5 tests**. Browser regression is deferred to later work items; no E2E pass is claimed here.
- Machine-readable recovery evidence: [recovery.json](../../artifacts/lab-04/data-foundation/recovery.json). Contains exact credential-free targets, tool versions, commands, counts and checksums; the backup itself contains session material and is temporary, so it is not committed.

The first attempt failed because Docker was unavailable. The first schema-diff attempt used the global test schema instead of the fixture schema; the test now explicitly supplies the source datasource to the diff process. Neither failed attempt is counted as a pass.

## Reproduction

Start the dedicated PostgreSQL Docker container with loopback port 55433 and configure a guarded `.env.test.local`. Its configured user must be able to create/drop disposable test databases and run local `pg_dump`/`pg_restore` inside that container. Installed PostgreSQL tools are used from the container; credentials are kept out of committed files/logs.

```text
npm test -- server/tests/lab-03/migration.integration.test.ts server/tests/lab-04/migration-recovery.integration.test.ts --reporter=dot
npm run build:server
```

Run database suites sequentially. If this Windows setup uses preinstalled Prisma engines, set `PRISMA_SCHEMA_ENGINE_BINARY` and `PRISMA_QUERY_ENGINE_LIBRARY` to their local installed paths before testing; this avoids downloading replacement engines.

## Limits

Independent review/integration of the data PR is complete. Actions API/UI and explicit Start-control coverage are now tracked by Issue #42; Ticket workflow, dashboard filters and final release remain subsequent work items. Passing data tests do not complete LAB4.
