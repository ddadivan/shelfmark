import { randomBytes } from 'node:crypto';

// Existing `createApp()` specs boot the whole app, which now validates the database and auth
// configuration. Prisma connects lazily, so the loopback URL below is never dialled; the secret is
// random per run. Tests that need other values pass their own environment.
process.env['DATABASE_URL'] ??= 'postgresql://test:test@127.0.0.1:1/test';
process.env['BETTER_AUTH_SECRET'] ??= randomBytes(32).toString('hex');
