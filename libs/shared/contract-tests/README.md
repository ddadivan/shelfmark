# contract-tests

Scenarios that both back ends must pass, so the web mock API and the real API cannot drift apart (#341).

- `src/scenarios/*-scenarios.const.ts`: `ContractScenario[]` per domain (links, folders, tags, pins, views, trash, settings, sharing, feedback, export), `(apis: ContractApis) => Promise<void>`. Expected values are written out in the scenario; ids and timestamps are `ANY.id` / `ANY.time`; objects must match field by field (an extra or missing field fails).
- `src/models/contract-*-api.interface.ts`: what a scenario can call, in the types of `@shelfmark/contracts`. Failures are `ContractError(status, code)`; `code` is the single-string message of the API error body (`FOLDER_ERROR_MESSAGE.NotFound`, ...), `null` for validation lists.
- Runner A: `apps/web/src/app/contract/` (the mock API classes on fake timers). Runner B: `apps/api/src/contract/` with the adapter in `apps/api/test-utils/contract/` (the Nest app on PGlite with supertest). Both are normal `test` targets, and both projects depend on this lib through the path alias `@shelfmark/contract-tests`, so a change here marks `web` and `api` affected.
- Tags `scope:shared`, `type:contracts`: it may import only `@shelfmark/contracts` (runtime constants included); it never imports from an app.

How to add a scenario for a new endpoint: `.claude/skills/create-api-module/SKILL.md`, section 7.
