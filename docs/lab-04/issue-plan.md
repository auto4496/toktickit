# Lab 4 Work Items

Six work items use GitHub Issues and staged integration. Contract #38/#39 and data foundation #40/#41 were approved and merged by Datakung into `codex/lab4-staging`; both Issues are closed and their Project status is Done. [Issue #42](https://github.com/auto4496/toktickit/issues/42) tracks Actions API/UI. Issues for work items 4–6 have not been created.

1. Contract: specification, UI/API contract, tests and review of unresolved choices.
2. [Data foundation #40](https://github.com/auto4496/toktickit/issues/40) / [PR #41](https://github.com/auto4496/toktickit/pull/41): additive migration, guarded seed, Action model, preservation and recovery tests. Approved `301c902` and merged `c039a7d` on 2026-10-06. See [data evidence](data-foundation.md).
3. [Actions API/UI #42](https://github.com/auto4496/toktickit/issues/42) / [PR #43](https://github.com/auto4496/toktickit/pull/43): create, edit/reassign, Start, complete/cancel, revisions, authorization and responsive detail. Branch `codex/lab4-3-actions`; implementation evidence in [actions.md](actions.md). Datakung requested lost-create-response recovery and routine screenshot isolation; corrected increment awaits re-review/integration.
4. Ticket workflow: resolution gate and full transition regression.
5. Role dashboards: authoritative metrics, APIs, drill-down and UI.
6. Final hardening: Lab 1–3 regression, accessibility, visual checks, README and evidence.

Branch flow: individual `codex/lab4-*` branches into `codex/lab4-staging`, then reviewed staging into `main`. The contract branch is `codex/lab4-1-engineering-contract`. Update this plan with actual issue/PR links as they are created.
