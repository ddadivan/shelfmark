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
// Specs send forwarded headers to simulate distinct clients: opt in explicitly (never implied by NODE_ENV).
process.env['TRUST_PROXY_HEADERS'] = '1';
process.env['NODE_ENV'] = NODE_ENV.Development;
delete process.env['TEST'];

// ADR 0047 point 5 / ADR 0048: no spec may reach a real model. The provider SDK is replaced by a
// client whose constructor throws, so a code path that builds one fails the test instead of calling
// the network (`src/ai/providers/real-client.guard.spec.ts` pins this).
vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    constructor() {
      throw new Error('A real Anthropic client must never be constructed in tests');
    }
  }
  return { default: Anthropic, Anthropic };
});
