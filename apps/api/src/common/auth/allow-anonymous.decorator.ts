/**
 * Marks a route as reachable without a session. This is the integration's own decorator (metadata
 * key `PUBLIC`); `SessionAuthGuard` reads it before any session lookup. Every use must be
 * justified in the PR description, in a comment at the use site and as an entry in `PUBLIC_ROUTES`
 * (a spec fails otherwise). Never put it on a controller class. Swagger (`/api/docs`) and
 * `/api/auth/*` are mounted outside Nest's router, so the guard never sees them.
 */
export { AllowAnonymous } from '@thallesp/nestjs-better-auth';
