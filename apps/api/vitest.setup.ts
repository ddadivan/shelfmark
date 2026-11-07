import { randomBytes } from 'node:crypto';
import { NODE_ENV } from './src/config/models/node-env.const';

// Existing `createApp()` specs boot the whole app, which now validates the database and auth
// configuration. Prisma connects lazily, so the loopback URL below is never dialled; the secret is
// random per run. Tests that need other values pass their own environment.
process.env['DATABASE_URL'] ??= 'postgresql://test:test@127.0.0.1:1/test';
process.env['BETTER_AUTH_SECRET'] ??= randomBytes(32).toString('hex');

// Defence in depth: `createAuth` sets `advanced.disableOriginCheck: false`, which already keeps
// Better Auth's origin and CSRF checks on under NODE_ENV=test or a truthy TEST (its default would
// skip them). Specs still run as `development` without `TEST` so nothing in Better Auth takes a
// test-only shortcut; `vitest-setup.spec.ts` pins this. Non-production for our own config too.
process.env['NODE_ENV'] = NODE_ENV.Development;
delete process.env['TEST'];
