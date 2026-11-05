# 0010. NestJS as the backend framework

- Status: Accepted
- Date: 2026-11-05
- Source: `docs/PROJECT.md` 5, 5.2, 6.2; `apps/api/CLAUDE.md`

## Context

The API serves about 17 REST endpoints under `/api` (PROJECT.md 6.2): links with server-side preview fetching, folders, tags, account, demo and export. The whole stack is TypeScript, and request/response types are shared with the web app through `libs/shared/contracts`. Build tooling and the security baseline are covered by [0006](0006-api-nestjs-build-and-tests.md) and [0007](0007-api-security-baseline.md).

## Decision

- **NestJS** (Node.js + TypeScript) for the backend: modules, DI and decorators, the same style as Angular — one way of structuring code across the stack.
- **REST + JSON**; DTOs and response types come from `libs/shared/contracts` (contract first). A DTO class `implements` the contract interface and carries `class-validator` rules and `@ApiProperty`.
- **Modules by domain**: `auth`, `users`, `links`, `folders`, `tags`, `metadata` (preview fetching). Controllers are thin; logic lives in services.
- **Global cross-cutting pieces**: `ExceptionFilter` with one error shape, `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`), session guard (Better Auth, [0012](0012-better-auth-oauth.md)) and `ThrottlerGuard`; Logging and Timeout interceptors.
- **API docs**: Swagger / OpenAPI generated from the code.
- **No background jobs in stage 1**: previews are fetched synchronously with a timeout and fallback; a queue (BullMQ + Redis) only if saving becomes slow.

## Consequences

- Angular developers (and agents) apply the same patterns on both sides; shared contracts keep the two in sync.
- Decorator-based DI needs decorator metadata at build and test time, which constrains tooling ([0006](0006-api-nestjs-build-and-tests.md)).
- Runs as one Vercel Function in stage 1 ([0013](0013-vercel-hobby-hosting.md)); the same code can move to Cloud Run or Render later without changes (PROJECT.md 5.7).

## Alternatives considered

PROJECT.md does not record rejected backend frameworks; NestJS was chosen for the shared Angular-like style and full-stack TypeScript.
