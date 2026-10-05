# Lab 4 Work Items

Six work items use GitHub Issues and staged integration. [Issue #38](https://github.com/auto4496/toktickit/issues/38) is complete: Datakung approved commit `4886585` and merged [PR #39](https://github.com/auto4496/toktickit/pull/39) into `codex/lab4-staging` on 2026-10-05. Issue #38 is closed and its Project status is Done. [Issue #40](https://github.com/auto4496/toktickit/issues/40) tracks data foundation and migration recovery. Issues for work items 3–6 have not been created.

1. Contract: specification, UI/API contract, tests and review of unresolved choices.
2. [Data foundation #40](https://github.com/auto4496/toktickit/issues/40) / [PR #41](https://github.com/auto4496/toktickit/pull/41): additive migration, guarded seed, Action model, preservation and recovery tests. Branch `codex/lab4-2-data-foundation`; independent review/integration pending. See [data evidence](data-foundation.md).
3. Actions API/UI: create, edit, transition, revisions, auth and responsive detail.
4. Ticket workflow: resolution gate and full transition regression.
5. Role dashboards: authoritative metrics, APIs, drill-down and UI.
6. Final hardening: Lab 1–3 regression, accessibility, visual checks, README and evidence.

Branch flow: individual `codex/lab4-*` branches into `codex/lab4-staging`, then reviewed staging into `main`. The contract branch is `codex/lab4-1-engineering-contract`. Update this plan with actual issue/PR links as they are created.
