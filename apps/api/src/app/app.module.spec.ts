import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { FIXTURE_ROUTE } from '../../test-utils/models/fixture-route.const';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import { NotesFixtureModule } from '../../test-utils/isolation/notes-fixture.module';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CsrfGuard } from '../common/csrf/csrf.guard';
import { AppModule } from './app.module';

const NOTES = `/api/${FIXTURE_ROUTE.Notes}`;
const FORWARDED_FOR = 'x-forwarded-for';

interface GuardProvider {
  provide: unknown;
  useClass?: unknown;
  useFactory?: () => unknown;
}

function isGuardProvider(value: unknown): value is GuardProvider {
  return typeof value === 'object' && value !== null && Reflect.get(value, 'provide') === APP_GUARD;
}

describe('AppModule global guards', () => {
  it('registers the throttler, then the CSRF guard, then the session guard', () => {
    const providers: unknown[] = Reflect.getMetadata('providers', AppModule);
    const guards = providers.filter(isGuardProvider);
    expect(guards).toHaveLength(3);
    expect(guards[0].useClass).toBe(ThrottlerGuard);
    expect(guards[1].useFactory?.()).toBeInstanceOf(CsrfGuard);
    expect(guards[2].useClass).toBe(SessionAuthGuard);
  });

  describe('over HTTP on the real AppModule', () => {
    let t: AuthTestApp;

    beforeAll(async () => {
      t = await createAuthTestApp({
        imports: [NotesFixtureModule],
        defaultRateLimit: { limit: 2, ttl: 60_000 },
      });
    });

    afterAll(async () => {
      await t.close();
    });

    it('rejects a flood with 429 before the session guard can answer 401', async () => {
      const send = () =>
        request(t.app.getHttpServer()).get(NOTES).set(FORWARDED_FOR, '203.0.113.90');
      await send().expect(401);
      await send().expect(401);
      const res = await send();
      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toMatch(/^\d+$/);
    });

    it('rejects a foreign Origin with 403 before the session guard can answer 401', async () => {
      const res = await request(t.app.getHttpServer())
        .post(NOTES)
        .set(FORWARDED_FOR, '203.0.113.91')
        .set('Origin', 'https://evil.test')
        .send({ title: 'x' });
      expect(res.status).toBe(403);
    });
  });
});
