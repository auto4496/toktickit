# Lab 4 Role Dashboards and Drill-down

Work item: [Issue #46](https://github.com/auto4496/toktickit/issues/46), approved/merged [PR #47](https://github.com/auto4496/toktickit/pull/47). Datakung approved correction head `884df39` on 2026-10-10 at 03:41:12 Asia/Bangkok, then merged `72c5553` at 03:41:27. Issue #46 is closed/Done. Branch `codex/lab4-5-role-dashboards` started at independently reviewed merge `69b32d6`; original implementation/evidence commit `e0c3a98`. Dated pending statements below describe the earlier author runs; this final approval supersedes them.

## Implementation

- Requester `/dashboard` and Staff/Admin `/staff/dashboard` use role-protected APIs. Requester queries always constrain the session owner; recent rows contain only summary fields, with no Internal Notes, Action history or account secrets. Admin retains Users navigation and Staff-only status/Owner permissions remain unchanged.
- One UTC clock defines `asOf` and the inclusive previous seven-day window. Each response uses one repeatable-read transaction. Counts include the documented scopes; recent lists return at most five rows ordered by update time, then ID descending. Current RESOLVED status within the window is an activity proxy, not a historical transition counter.
- A shared server open-status set excludes RESOLVED/CLOSED/CANCELLED across dashboard and both list APIs. `status=open` intersects exact status and all other filters. `actionAssignee=me` uses an existential Action relation and the open Ticket scope: only the current actor's PLANNED/IN_PROGRESS follow-ups qualify. Tickets appear once even when multiple Actions match, while the dashboard counts each Action.
- Cards link to documented list filters and recent rows to role-appropriate detail. Lists initialize visible scope/owner/status/priority/follow-up controls from URLs and clear those scopes through normal filter controls. Query-bearing routes are preserved through sign in; query changes remount lists. Browser Back/Forward retains the router's existing unsaved-account guard.
- Requester/Staff normal sign-in landing is the corresponding dashboard; explicit allowed destinations still take precedence. Admin landing remains Users. Existing test helpers explicitly request My Tickets where those journeys require the list.
- Loading, zero, safe failure/retry and role denial are explicit. Metrics remain absent after failure; there is no partial response. Native keyboard links, text status/priority and mobile wrapping use the established green theme.

## Verification

Observed author verification on 2026-10-09:

| Check | Result |
|---|---|
| Full Vitest | **47 files / 483 tests passed**, one uninterrupted run, 140.28 seconds; includes 25 new dashboard/API/route checks and retained recovery/concurrency suites |
| Production builds | Server TypeScript and client TypeScript/Vite passed |
| Complete dashboard browser suite | **4 passed**, 38.7 seconds including startup/setup (final dedicated-account run); native keyboard links, actual API filter results, history, detail, all roles and feedback states |
| Retained Actions/workflow browser run | **9 passed** (7 Actions + 2 workflow), observed before the Actions config was narrowed to its own seven cases; command was `npm run test:e2e:actions -- --grep-invert E2E-03` |
| Affected legacy browser run | **13 passed**, 1.9 minutes: authentication/password gate/logout, Requester creation/isolation/attachments, Admin account management and unsaved navigation, Staff lifecycle and four-width integrated recovery |
| Curated evidence | Nine dashboard PNGs published after complete success; all 30 Actions/workflow/dashboard screenshot byte lengths and SHA-256 values match manifests |
| Visual review | Requester mobile, Staff tablet and Admin desktop inspected: readable wrapping, no overlapping controls; automated overflow checks pass at all three widths |

The three sequential browser groups cover **26 distinct cases**. The final dashboard capture is repeated after separating its own Requester/Staff/Admin/empty-account fixtures, so combined-suite runs do not inherit another journey's user metrics. Full Vitest emitted React `act` warnings in the inherited TicketWorkflow synthetic-submit case (TicketConversation/ActionsTaken updates); all assertions passed. No dashboard test warning or production failure is inferred from those warnings. Recovery testing regenerated its historical JSON artifact; that generated-only change was restored so approved evidence is retained.

Commands (isolated test PostgreSQL only; DB suites run sequentially):

```text
npx vitest run
npm run build:server
npm run build:client
npm run test:e2e:dashboards
npm run test:e2e:capture:dashboards
npm run test:e2e:actions
npm run test:e2e:workflow
npm run test:e2e:lab3 -- e2e/lab-02/authentication.spec.ts e2e/lab-02/requester-ticket-flow.spec.ts e2e/lab-03/admin-users.spec.ts e2e/lab-03/staff-ticket-flow.spec.ts e2e/lab-03/system-verification.spec.ts
```

Routine dashboard screenshots write only ignored `test-results/lab-04/dashboards`. Explicit capture runs the complete dashboard browser suite first, validates all nine PNG widths/signatures, and then publishes [manifest](../../artifacts/lab-04/dashboards/manifest.json) and screenshots together. The manifest records base HEAD and the author working tree at capture time; it does not claim a dirty capture was from an exact committed head. Existing Actions/workflow evidence remains unchanged.

## Observed corrections and limits

- Initial route component run found an ambiguous test locator: both the filter form and empty-results panel provide Clear filters. The test now selects the real form control; production behavior was unchanged.
- The first browser launch timed out during web-server startup, before tests or evidence publication. It is not a passing browser result.
- Dashboard configuration allows 120 seconds for cold server startup through the Windows linked dependencies, retaining real readiness checks and the original per-test timeout. Verification logs used `DEBUG=pw:webserver` to observe startup. Actions configuration explicitly selects its seven original cases; workflow and dashboards retain their separate suites, so routine Actions capture does not inadvertently include later dashboard fixtures.
- The first executed browser suite found a shadowed response variable in the test query observer, then duplicated fixtures after Playwright restarted a failed worker. Corrected the observer and added teardown for the exact created fixture IDs; failed runs published no evidence.
- A subsequent 3/4 browser run exposed an overly exact selector for the existing implicitly labelled Status select. The test now uses its combobox role/name prefix, retaining the actual CLOSED/follow-up intersection assertion.
- Inspection before review found that shared global E2E accounts could pick up other journeys' Tickets/Actions in a combined run. Dashboard fixtures now create four dedicated accounts, scope their exact metric assertions to those users, and clean up only their created IDs/sessions.
- Full final release/report, seed-scale query-plan evidence and student reflection remain work item 6. Author execution does not substitute for Datakung's independent approval.

## Peer review correction — 2026-10-10

Datakung [requested changes](https://github.com/auto4496/toktickit/pull/47#discussion_r4232825709) on `1f1adc2`: the dashboard fixture's root-level Prisma import depended on a generated root client, while normal `npm run prisma:generate` generates the server client. Peer confirmed 483 tests and both builds, and 26 relevant browser cases using a temporary client-path workaround; normal dashboard collection/capture was blocked on their installation.

The fixture now resolves `@prisma/client` through `createRequire(path.resolve('server/package.json'))`, matching the existing E2E database/setup helpers. The root package import is type-only and erased at runtime. Both fixture setup and cleanup use that same server client.

Observed correction verification on 2026-10-10, with `NODE_PATH` unset and no client-path workaround:

- `npm run prisma:generate` succeeded and generated the server client (v6.19.3). A runtime resolution check loaded the server package successfully.
- `npm run test:e2e:dashboards`: **4 passed**, 29.8 seconds. This routine run preserved all 30 curated screenshot hashes and byte lengths.
- `npm run test:e2e:capture:dashboards`: **4 passed**, 15.4 seconds, then explicitly published all nine updated dashboard PNGs with a refreshed manifest. The same four cases ran twice; this is not eight distinct cases. Actions/workflow artifacts remain unchanged.
- Both browser commands also ran with `DEBUG` unset. Only fixture dependency resolution and evidence/docs changed; the earlier application test/build results are retained rather than claimed as new runs.

Correction published for Datakung's re-review; independent approval remains pending.
