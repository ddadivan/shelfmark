/**
 * Route protection (ADR 0029). The scan runs on `AppModule` plus the test-only `NotesFixtureModule`:
 * the real application has a single route today (`GET /api/health`), so the fixture gives the
 * behavioural sweep guarded routes to check. A second scan of the real Express router stack makes
 * sure no reachable Nest route escapes the scanned set. The negative tests at the end prove the
 * scanner itself reports each kind of violation, using throwaway controllers.
 */
import { randomUUID } from 'node:crypto';
import { All, Controller, Get, Post } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AUTH_ENDPOINT } from '@shelfmark/contracts';
import { AuthService, OptionalAuth } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { NotesFixtureModule } from '../../../test-utils/isolation/notes-fixture.module';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';
import { AllowAnonymous } from './allow-anonymous.decorator';
import { CurrentUser } from './current-user.decorator';
import { HTTP_METHOD } from './models/http-method.const';
import type { HttpMethod } from './models/http-method.type';
import type { RouteScan } from './models/route-scan.interface';
import { PUBLIC_ROUTES } from './models/public-route.const';
import { expressRouteKeys, findRouteViolations, scanRoutes } from './scan-routes';

function violationsOf(scan: RouteScan, tag: string): string[] {
  return findRouteViolations(scan).filter((v) => v.startsWith(`${tag}:`));
}

describe('route protection', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let scan: RouteScan;

  beforeAll(async () => {
    t = await createAuthTestApp({ imports: [NotesFixtureModule] });
    scan = scanRoutes(t.app);
    users = await createIsolationUsers(t);
  });

  afterAll(async () => {
    await t.close();
  });

  it('finds the routes of the application', () => {
    expect(scan.routes.map((r) => r.key)).toContain('GET /api/health');
    expect(violationsOf(scan, 'no-routes')).toEqual([]);
  });

  it('has no violation at all', () => {
    expect(findRouteViolations(scan)).toEqual([]);
  });

  it('opens exactly the routes listed in PUBLIC_ROUTES, each with a reason', () => {
    expect(violationsOf(scan, 'public-mismatch')).toEqual([]);
    expect(violationsOf(scan, 'empty-reason')).toEqual([]);
    for (const entry of PUBLIC_ROUTES) expect(entry.reason.trim()).not.toBe('');
  });

  it('never opens a whole controller or makes authentication optional', () => {
    expect(violationsOf(scan, 'public-class')).toEqual([]);
    expect(violationsOf(scan, 'optional-class')).toEqual([]);
    expect(violationsOf(scan, 'optional-route')).toEqual([]);
  });

  it('never reads the current user on a public route', () => {
    expect(violationsOf(scan, 'current-user-on-public')).toEqual([]);
  });

  it('serves no Nest route through Express that the scan did not find', () => {
    const scanned = new Set(scan.routes.map((r) => r.key));
    const unscanned = expressRouteKeys(t.app).filter((key) => !scanned.has(key));
    expect(unscanned).toEqual([]);
    expect(expressRouteKeys(t.app)).toContain('GET /api/health');
  });

  describe('behaviour of every guarded route', () => {
    const guarded = () => scan.routes.filter((r) => !r.isPublic);
    const call = (key: string, cookie?: string) => {
      const [method, rawPath] = key.split(' ');
      const path = rawPath.replace(/:[A-Za-z]+/g, randomUUID());
      const verb = method.toLowerCase() as Lowercase<HttpMethod>;
      const req = request(t.app.getHttpServer())[verb](path);
      return cookie === undefined ? req : req.set('Cookie', cookie);
    };
    const expectUnauthorized = (res: { status: number; body: unknown }) => {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Unauthorized',
        requestId: expect.any(String),
      });
    };

    it('has guarded routes to sweep', () => {
      expect(guarded().length).toBeGreaterThanOrEqual(1);
    });

    it('answers 401 without a cookie', async () => {
      for (const route of guarded()) expectUnauthorized(await call(route.key));
    });

    it('answers 401 for a forged cookie', async () => {
      const name = users.owner.cookie.split('=')[0];
      for (const route of guarded()) {
        expectUnauthorized(await call(route.key, `${name}=forged.value`));
      }
    });

    it('answers 401 for the cookie of a signed-out session', async () => {
      const { cookie } = users.intruder;
      await request(t.app.getHttpServer())
        .post(AUTH_ENDPOINT.SignOut)
        .set('Origin', t.baseUrl)
        .set('Cookie', cookie)
        .expect(200);
      for (const route of guarded()) expectUnauthorized(await call(route.key, cookie));
    });
  });

  it('serves public routes without ever looking up the session', async () => {
    const getSession = vi.spyOn(t.app.get(AuthService).api, 'getSession');
    try {
      const res = await request(t.app.getHttpServer())
        .get('/api/health')
        .set('Cookie', users.owner.cookie);
      expect(res.status).toBe(200);
      expect(getSession).not.toHaveBeenCalled();
    } finally {
      getSession.mockRestore();
    }
  });
});

describe('route scanner (negative tests)', () => {
  @AllowAnonymous()
  @Controller('bad-public-class')
  class PublicClassController {
    @Get()
    read(): string {
      return 'x';
    }
  }

  @Controller('bad-optional')
  class OptionalController {
    @OptionalAuth()
    @Get()
    read(): string {
      return 'x';
    }
  }

  @Controller('bad-current-user')
  class CurrentUserOnPublicController {
    @AllowAnonymous()
    @Get()
    read(@CurrentUser() user: unknown): unknown {
      return user;
    }
  }

  @Controller(['multi-a', 'multi-b'])
  class MultiPathController {
    @Get(['one', 'two'])
    read(): string {
      return 'x';
    }
  }

  @Controller('all-verbs')
  class AllVerbsController {
    @All()
    any(): string {
      return 'x';
    }
  }

  @OptionalAuth()
  @Controller('bad-optional-class')
  class OptionalClassController {
    @Post()
    write(): string {
      return 'x';
    }
  }

  async function scanOf(...controllers: (new () => object)[]): Promise<RouteScan> {
    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      controllers,
    }).compile();
    try {
      return scanRoutes(moduleRef);
    } finally {
      await moduleRef.close();
    }
  }

  it('reports a public controller class', async () => {
    const scan = await scanOf(PublicClassController);
    expect(violationsOf(scan, 'public-class')).toEqual(['public-class: PublicClassController']);
  });

  it('reports an optional handler and an optional class', async () => {
    const scan = await scanOf(OptionalController, OptionalClassController);
    expect(violationsOf(scan, 'optional-route')).toEqual(['optional-route: GET /api/bad-optional']);
    expect(violationsOf(scan, 'optional-class')).toEqual([
      'optional-class: OptionalClassController',
    ]);
  });

  it('reports @CurrentUser() on a public route and the unlisted public route', async () => {
    const scan = await scanOf(CurrentUserOnPublicController);
    expect(violationsOf(scan, 'current-user-on-public')).toEqual([
      'current-user-on-public: GET /api/bad-current-user',
    ]);
    expect(violationsOf(scan, 'public-mismatch')).toContain(
      'public-mismatch: GET /api/bad-current-user',
    );
  });

  it('expands array paths of controller and handler as a cross product', async () => {
    const scan = await scanOf(MultiPathController);
    expect(scan.routes.map((r) => r.key).sort()).toEqual([
      `${HTTP_METHOD.Get} /api/multi-a/one`,
      `${HTTP_METHOD.Get} /api/multi-a/two`,
      `${HTTP_METHOD.Get} /api/multi-b/one`,
      `${HTTP_METHOD.Get} /api/multi-b/two`,
    ]);
  });

  it('refuses @All()', async () => {
    await expect(scanOf(AllVerbsController)).rejects.toThrow(/uses @All\(\)/);
  });

  it('reports an empty scan', () => {
    expect(findRouteViolations({ controllers: [], routes: [] })).toContain(
      'no-routes: nothing found',
    );
  });
});
