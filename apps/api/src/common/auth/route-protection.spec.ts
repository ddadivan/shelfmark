import { randomUUID } from 'node:crypto';
import { PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { AuthService } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { NotesFixtureModule } from '../../../test-utils/isolation/notes-fixture.module';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';
import { AUTH_ENDPOINT } from '@shelfmark/contracts';
import { currentUserFactory } from './current-user.decorator';
import { AUTH_METADATA_KEY } from './models/auth-metadata-key.const';
import { PUBLIC_ROUTES } from './models/public-route.const';

interface FoundRoute {
  key: string;
  method: string;
  path: string;
  isPublic: boolean;
  usesCurrentUser: boolean;
}

function joinPath(...parts: string[]): string {
  const joined = parts
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `/${joined}`;
}

function firstPath(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

function usesCurrentUser(controller: object, method: string): boolean {
  const args: unknown = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller.constructor, method);
  return (
    typeof args === 'object' &&
    args !== null &&
    Object.values(args).some((arg) => Reflect.get(arg as object, 'factory') === currentUserFactory)
  );
}

describe('route protection', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let classes: { name: string; isPublic: boolean; isOptional: boolean }[];
  let routes: FoundRoute[];
  let optionalHandlers: string[];

  beforeAll(async () => {
    t = await createAuthTestApp({ imports: [NotesFixtureModule] });
    const discovery = t.app.get(DiscoveryService, { strict: false });
    const scanner = t.app.get(MetadataScanner, { strict: false });
    classes = [];
    routes = [];
    optionalHandlers = [];
    for (const wrapper of discovery.getControllers()) {
      const instance: unknown = wrapper.instance;
      const metatype = wrapper.metatype;
      if (typeof instance !== 'object' || instance === null || typeof metatype !== 'function') {
        continue;
      }
      classes.push({
        name: metatype.name,
        isPublic: Reflect.getMetadata(AUTH_METADATA_KEY.Public, metatype) !== undefined,
        isOptional: Reflect.getMetadata(AUTH_METADATA_KEY.Optional, metatype) !== undefined,
      });
      const base = firstPath(Reflect.getMetadata(PATH_METADATA, metatype));
      for (const name of scanner.getAllMethodNames(Object.getPrototypeOf(instance))) {
        const handler: unknown = Reflect.get(instance, name);
        if (typeof handler !== 'function') continue;
        const verb: unknown = Reflect.getMetadata(METHOD_METADATA, handler);
        if (typeof verb !== 'number') continue;
        const method = RequestMethod[verb];
        const path = joinPath('api', base, firstPath(Reflect.getMetadata(PATH_METADATA, handler)));
        if (Reflect.getMetadata(AUTH_METADATA_KEY.Optional, handler) !== undefined) {
          optionalHandlers.push(`${method} ${path}`);
        }
        routes.push({
          key: `${method} ${path}`,
          method,
          path,
          isPublic: Reflect.getMetadata(AUTH_METADATA_KEY.Public, handler) !== undefined,
          usesCurrentUser: usesCurrentUser(instance, name),
        });
      }
    }
    users = await createIsolationUsers(t);
  });

  afterAll(async () => {
    await t.close();
  });

  it('finds the routes of the application', () => {
    expect(routes.length).toBeGreaterThanOrEqual(1);
    expect(routes.map((r) => r.key)).toContain('GET /api/health');
  });

  it('opens exactly the routes listed in PUBLIC_ROUTES, each with a reason', () => {
    const open = routes.filter((r) => r.isPublic).map((r) => r.key);
    const listed = PUBLIC_ROUTES.map((r) => `${r.method} ${r.path}`);
    expect(open.sort()).toEqual(listed.sort());
    for (const entry of PUBLIC_ROUTES) expect(entry.reason.trim()).not.toBe('');
  });

  it('never opens a whole controller', () => {
    expect(classes.filter((c) => c.isPublic).map((c) => c.name)).toEqual([]);
  });

  it('never makes authentication optional', () => {
    expect(classes.filter((c) => c.isOptional).map((c) => c.name)).toEqual([]);
    expect(optionalHandlers).toEqual([]);
  });

  it('never reads the current user on a public route', () => {
    expect(routes.filter((r) => r.isPublic && r.usesCurrentUser).map((r) => r.key)).toEqual([]);
  });

  describe('behaviour of every guarded route', () => {
    const guarded = () => routes.filter((r) => !r.isPublic);
    const call = (route: FoundRoute, cookie?: string) => {
      const path = route.path.replace(/:[A-Za-z]+/g, randomUUID());
      const verb = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
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
      for (const route of guarded()) expectUnauthorized(await call(route));
    });

    it('answers 401 for a forged cookie', async () => {
      const name = users.owner.cookie.split('=')[0];
      for (const route of guarded()) {
        expectUnauthorized(await call(route, `${name}=forged.value`));
      }
    });

    it('answers 401 for the cookie of a signed-out session', async () => {
      const { cookie } = users.intruder;
      await request(t.app.getHttpServer())
        .post(AUTH_ENDPOINT.SignOut)
        .set('Origin', t.baseUrl)
        .set('Cookie', cookie)
        .expect(200);
      for (const route of guarded()) expectUnauthorized(await call(route, cookie));
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
