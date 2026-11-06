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
- Current user from the Better Auth session decorator; never from the body or query.
- Routes are protected by the global guard; mark public ones explicitly with `@AllowAnonymous()` and justify it in the PR.
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
- **Isolation:** for every route, user B gets 404 for user A's resources and lists never include A's data.
- Coverage ≥ 80% for `apps/api`.

## 7. Done when

`npx nx lint api`, `npx nx test api --coverage`, `npx nx build api` pass; the route appears in Swagger; `security-checklist` items for the module are covered.
