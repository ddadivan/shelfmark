---
name: create-api-module
description: Template for a new Shelfmark NestJS domain module - controller, service, DTOs in libs/shared/contracts, validation, userId filtering, unified errors, Swagger, unit and data-isolation tests. Use when adding or extending an API module in apps/api.
---

# Create an API module

## 1. Contract first

Add request / response types to `libs/shared/contracts/src/<domain>/` before writing the module — **one interface / type / const per file**, named after the export (PROJECT.md 5.0), re-exported from `src/index.ts`. No `any`, no TS `enum` (ADR 0024): a fixed value set is an `as const` object plus a derived union; the DTO validates with `@IsIn(Object.values(X))` and documents with `@ApiProperty({ enum: Object.values(X) })`. A runtime constant in contracts needs the api webpack alias first (ADR 0024), so until then contracts stay type-only.

```ts
// libs/shared/contracts/src/folders/folder-dto.interface.ts
export interface FolderDto {
  id: string;
  parentId: string | null;
  name: string;
  linkCount: number;
}
```

```ts
// libs/shared/contracts/src/folders/create-folder-request.interface.ts
export interface CreateFolderRequest {
  name: string;
  parentId?: string | null;
}
```

Validation classes (class-validator) live in `apps/api` and `implements` the contract interface so shapes cannot drift.

## 2. Files

```
apps/api/src/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  dto/create-<entity>.dto.ts      # class-validator, implements contract
  <domain>.controller.spec.ts
  <domain>.service.spec.ts
  <domain>.isolation.spec.ts      # user A vs user B
```

## 3. Controller

- Thin: parse, call service, return contract type. Swagger decorators on every route.
- Current user from `@CurrentUser()` (`user.id`, `src/common/auth`); never from the body, params or query. Never import the integration's `Session` decorator (ESLint forbids it).
- Routes are protected by the global `SessionAuthGuard`; a public route needs `@AllowAnonymous()` on the handler (never the class), an entry in `PUBLIC_ROUTES`, a comment at the use site and a justification in the PR.
- Stricter `@Throttle()` on expensive routes (create link, preview, export, demo).

## 4. Service

- **Every Prisma call includes `where: { userId }`** (or checks ownership of the parent first). Missing or foreign → `NotFoundException` (404), never 403.
- Lengths and fixed value sets (`@IsIn(Object.values(X))`) enforced by DTO validation and DB constraints (PROJECT.md 6.1).
- Only parameterised Prisma queries; `$queryRaw` with tagged templates if unavoidable; never `$queryRawUnsafe`.
- No logging of bodies, tokens or personal data.

## 5. Errors

Throw Nest HTTP exceptions; the global `ExceptionFilter` renders `{ statusCode, error, message, requestId }`. Validation errors → 400 / 422 with field info; conflicts (duplicate tag name) → 409.

## 6. Tests

- Service: happy path, validation edges, not-found.
- Controller: status codes and response shape.
- **Isolation:** `createIsolationUsers(t)` + `expectIsolated(t.app, users, scenario)` (`apps/api/test-utils/isolation`): user B gets 404 for user A's resources and lists never include A's data; provide or explicitly skip `update`, `remove`, `list`, `reference`.
- Coverage ≥ 80% for `apps/api`.
- **Contract scenarios (#341):** every endpoint the web calls gets a scenario that runs against the real API and the web mock, so the two cannot drift. See section 7.

## 7. Contract scenarios (API and web mock)

`libs/shared/contract-tests` holds scenarios, each `(apis: ContractApis) => Promise<void>`, that make calls and compare the result with explicit expected values (status, contract message, every field of the response, ids and timestamps as `ANY.id` / `ANY.time`). Runner B (`apps/api/src/contract/contract.integration.spec.ts`, PGlite, no network) runs them through supertest; runner A (`apps/web/src/app/contract/contract-scenarios.mock.spec.ts`) runs the same ones through the mock API classes. Both start from a new empty account. A scenario that passes on one side and fails on the other is drift: fix the side that disagrees with `docs/PROJECT.md` 6 and the contracts (usually the mock, so `fix(web): mock … matches the API`), never the scenario to fit a mock.

For a new endpoint (or a new behaviour of an old one):

1. **Contract first.** Types and messages (`<DOMAIN>_ERROR_MESSAGE`) in `libs/shared/contracts`.
2. **Interface.** Add the method to the domain's `Contract<Domain>Api` in `libs/shared/contract-tests/src/models/` (a new domain: new interface file, a field on `ContractApis`). Promises, contract types, nothing HTTP.
3. **Both adapters.** Runner B: the method in `apps/api/test-utils/contract/create-http-contract-apis.ts` (same path, body and query as the web's `Http<Domain>Api`; a non-2xx answer becomes a `ContractError(status, message)`). Runner A: the method in `apps/web/src/app/contract/testing/create-mock-contract-apis.ts` (`settle(mock.call(...))`; a rejection becomes a `ContractError` through `toContractError`).
4. **Scenarios.** In `libs/shared/contract-tests/src/scenarios/<domain>-scenarios.const.ts` (add the file to `contract-scenarios.const.ts` for a new domain): the happy path with the whole response compared (`expectEqual`, builders `expectedLink`, `expectedFolder`, `expectedTag`), then one scenario per error class with `expectError(call, { status, code })` where `code` is the contract message: 400 validation (status only, validation messages are lists), 404 for a missing or foreign object, 409 conflict or limit, 429. Name them by behaviour, prefixed by the domain (`scenario('tags', 'refuses a name that is taken, ignoring case', ...)`).
5. **Run both:** `npx nx test api` and `npx nx test web` (a change in the scenarios marks both projects affected). Fix the drift in the side that is wrong; the mock throws `mockHttpError(status, message)` (`apps/web/src/app/core/api/mock-http-error.ts`), shaped like the API's error body, never a plain `Error` (plain errors stay only for the e2e failure switches such as `MOCK_HOST.SaveFails`).

Out of scope for scenarios: demo seed data, e2e scenario switches, image capture and preview (they need the network), per-user isolation (the isolation tests cover that) and HTTP details the web cannot see (201 vs 200, headers).

## 8. Done when

`npx nx lint api`, `npx nx test api --coverage`, `npx nx build api` pass; the contract scenarios pass on both runners; the route appears in Swagger; `security-checklist` items for the module are covered.
