/**
 * Marks a route as reachable without a session. This is the integration's own decorator (metadata
 * key `PUBLIC`), so the global auth guard of #65 honours it without a change here. Every use must
 * be justified in the PR description and in a comment at the use site.
 *
 * NO-OP until #65 enables the global guard: all non-auth routes are currently public. Swagger
 * (`/api/docs`) is mounted outside Nest's router, so the guard never sees it.
 */
export { AllowAnonymous } from '@thallesp/nestjs-better-auth';
