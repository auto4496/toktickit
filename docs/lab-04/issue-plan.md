# Lab 4 Work Items

Six work items use GitHub Issues and staged integration. Contract #38/#39, data foundation #40/#41, Actions #42/#43 and workflow #44/#45 were approved and merged by Datakung into `codex/lab4-staging`; all four Issues are closed/Done. [Issue #46](https://github.com/auto4496/toktickit/issues/46) tracks role dashboards. Work item 6 has not been created.

1. Contract: specification, UI/API contract, tests and review of unresolved choices.
2. [Data foundation #40](https://github.com/auto4496/toktickit/issues/40) / [PR #41](https://github.com/auto4496/toktickit/pull/41): additive migration, guarded seed, Action model, preservation and recovery tests. Approved `301c902` and merged `c039a7d` on 2026-10-06. See [data evidence](data-foundation.md).
3. [Actions API/UI #42](https://github.com/auto4496/toktickit/issues/42) / [PR #43](https://github.com/auto4496/toktickit/pull/43): approved `935bcdf`, merged `68a88cc` on 2026-10-07. Peer independently passed 431 tests, seven browser journeys and both builds after recovery corrections. See [Actions evidence](actions.md).
4. [Ticket workflow #44](https://github.com/auto4496/toktickit/issues/44) / [PR #45](https://github.com/auto4496/toktickit/pull/45): approved `a1d1fce`, merged `69b32d6` on 2026-10-09. Peer confirmed 458 tests, 14 relevant browser cases and both builds. See [workflow.md](workflow.md).
5. [Role dashboards #46](https://github.com/auto4496/toktickit/issues/46) / [PR #47](https://github.com/auto4496/toktickit/pull/47): authoritative metrics, APIs, accurate open/follow-up drill-down and responsive UI. Branch `codex/lab4-5-role-dashboards` starts at `69b32d6`; 483 tests, 26 browser cases and both builds passed. See [dashboards.md](dashboards.md). Independent approval/integration pending.
6. Final hardening: Lab 1–3 regression, accessibility, visual checks, README and evidence.

Branch flow: individual `codex/lab4-*` branches into `codex/lab4-staging`, then reviewed staging into `main`. The contract branch is `codex/lab4-1-engineering-contract`. Update this plan with actual issue/PR links as they are created.
