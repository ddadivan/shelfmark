import type { RateLimitPreset } from './rate-limit-preset.interface';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Named limits per client IP (PROJECT.md 5.8, 6). `Default` applies to every route; the others are
 * stricter overrides applied with `@RateLimit(RATE_LIMIT.X)` on the route that needs them. `Auth`
 * is applied to the sign-in, callback and sign-out routes by `authRateLimitMiddleware`, because
 * Better Auth is mounted outside Nest's router. The limits of routes that do not exist yet
 * (`AddLink`, `Preview` #72, `Demo` #67, `Export` #107) are ready here so those issues only
 * decorate their handler. `DeleteAccount` guards `DELETE /api/me` (irreversible, so strict).
 * `Share` limits the owner's enable / reset of a public link (#276). `PublicCollection` is the
 * anonymous collection page (strict: it is a capability lookup anyone can try);
 * `PublicCollectionImage` its images (a page shows up to 50 cards with two images each; they are
 * `private, no-cache`, so every page view revalidates each image with its ETag, a 304 that still
 * counts against the limit).
 * `AddLinksBatch` (`POST /api/links/batch`, up to 100 links each) is stricter than `AddLink`;
 * `DeleteLinksBatch` guards `POST /api/links/batch/delete` (bulk move to Trash, #267, and the
 * Undo of a paste, #265).
 */
export const RATE_LIMIT = {
  Default: { limit: 120, ttl: MINUTE_MS },
  Auth: { limit: 20, ttl: MINUTE_MS },
  AddLink: { limit: 30, ttl: MINUTE_MS },
  AddLinksBatch: { limit: 5, ttl: MINUTE_MS },
  DeleteLinksBatch: { limit: 10, ttl: MINUTE_MS },
  // Bulk move / tags / favorite (#267): up to 100 links per call, one transaction each.
  UpdateLinksBatch: { limit: 30, ttl: MINUTE_MS },
  Preview: { limit: 20, ttl: MINUTE_MS },
  Demo: { limit: 5, ttl: HOUR_MS },
  Export: { limit: 5, ttl: MINUTE_MS },
  Feedback: { limit: 10, ttl: MINUTE_MS },
  Admin: { limit: 60, ttl: MINUTE_MS },
  DeleteAccount: { limit: 5, ttl: MINUTE_MS },
  Share: { limit: 20, ttl: MINUTE_MS },
  PublicCollection: { limit: 30, ttl: MINUTE_MS },
  PublicCollectionImage: { limit: 240, ttl: MINUTE_MS },
  // Irreversible Trash writes: delete forever and empty.
  TrashDelete: { limit: 10, ttl: MINUTE_MS },
  // Saved view writes (create, rename, delete, reorder): generous for menus, tight against scripts.
  ViewWrite: { limit: 30, ttl: MINUTE_MS },
} as const satisfies Record<string, RateLimitPreset>;
