import { randomBytes } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import type { AuthConfig } from '../config/models/auth-config.interface';
import type { PrismaClient } from '../generated/prisma/client';
import { authAllowListMiddleware } from './auth-allow-list.middleware';
import { createAuth } from './create-auth';
import { ALLOWED_AUTH_ROUTES } from './models/allowed-auth-route.const';

/** Express app with the allow-list in front of a sink that records what got through. */
function buildApp(): { app: express.Express; reached: string[] } {
  const reached: string[] = [];
  const app = express();
  app.use((_req, res, next) => {
    res.locals['requestId'] = 'rid-1';
    next();
  });
  app.use(authAllowListMiddleware);
  app.use((req, res) => {
    reached.push(`${req.method} ${req.originalUrl}`);
    res.status(200).json({ reached: true });
  });
  return { app, reached };
}

describe('authAllowListMiddleware', () => {
  it.each([
    ['POST', '/api/auth/sign-in/social'],
    ['GET', '/api/auth/callback/github'],
    ['GET', '/api/auth/callback/google'],
    ['GET', '/api/auth/get-session'],
    ['POST', '/api/auth/sign-out'],
  ])('lets %s %s through', async (method, path) => {
    const { app, reached } = buildApp();
    await request(app)[method === 'POST' ? 'post' : 'get'](`${path}?x=1`).expect(200);
    expect(reached).toHaveLength(1);
  });

  it.each([
    ['GET', '/api/auth/sign-in/social'],
    ['POST', '/api/auth/get-session'],
    ['POST', '/api/auth/callback/github'],
    ['GET', '/api/auth/sign-out'],
    ['GET', '/api/auth/callback/facebook'],
    ['GET', '/api/auth/callback/github/extra'],
    ['GET', '/api/auth/reset-password/abc'],
    ['GET', '/api/auth/verify-email'],
    ['GET', '/api/auth'],
    ['GET', '/api/auth/'],
    ['GET', '/api/auth/get-session/'],
    ['GET', '/api//auth/get-session'],
    ['GET', '/api/auth//get-session'],
    ['GET', '/API/AUTH/get-session'],
    ['GET', '/api/Auth/get-session'],
    ['GET', '/api/auth/Get-Session'],
    ['GET', '/api/auth/get%2Dsession'],
    ['GET', '/api/%61uth/get-session'],
    ['GET', '/api/auth%2Fget-session'],
    ['GET', '/api/./auth/get-session'],
    ['GET', '/api/x/../auth/get-session'],
    ['GET', '/api/auth/./get-session'],
    ['GET', '/api/auth/%2e%2e/auth/get-session'],
    ['GET', '/api/%zz'],
    ['HEAD', '/api/auth/get-session'],
    ['OPTIONS', '/api/auth/get-session'],
    ['DELETE', '/api/auth/sign-out'],
  ])('answers %s %s with 404 and never reaches the router', async (method, path) => {
    const { app, reached } = buildApp();
    const res = await request(app)[method.toLowerCase() as 'get'](path);
    expect(res.status).toBe(404);
    if (method !== 'HEAD') {
      expect(res.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
        requestId: 'rid-1',
      });
    }
    expect(reached).toEqual([]);
  });

  it('leaves everything outside /api/auth alone', async () => {
    const { app, reached } = buildApp();
    for (const path of ['/api/health', '/api/authors', '/api/docs', '/api/auth-like/x', '/']) {
      await request(app).get(path).expect(200);
    }
    expect(reached).toHaveLength(5);
  });

  describe('drift guard against Better Auth', () => {
    const config: AuthConfig = {
      secret: randomBytes(32).toString('hex'),
      baseUrl: 'https://app.example.test',
      trustedOrigins: ['https://app.example.test'],
      providers: {},
      isProduction: true,
    };
    // Built without disabledPaths: the allow-list must hold on its own.
    const { api } = createAuth({} as PrismaClient, config, []);
    const endpoints = Object.values(api).flatMap((endpoint) => {
      const path: unknown = Reflect.get(endpoint, 'path');
      const method: unknown = Reflect.get(Reflect.get(endpoint, 'options') ?? {}, 'method');
      if (typeof path !== 'string') {
        return [];
      }
      const methods = Array.isArray(method) ? method : [method];
      return methods
        .filter((m): m is string => typeof m === 'string' && m !== '*')
        .map((m) => ({ method: m, url: `/api/auth${path.replace(/:\w+/g, 'abc')}` }));
    });

    it('enumerates the Better Auth endpoints', () => {
      expect(endpoints.length).toBeGreaterThan(25);
      expect(endpoints).toContainEqual({ method: 'GET', url: '/api/auth/reset-password/abc' });
    });

    it('serves exactly the allow-list, every other endpoint is a 404 (GET and POST too)', async () => {
      const allowedUrls = ALLOWED_AUTH_ROUTES.map((route) => route.method);
      expect(allowedUrls).toHaveLength(4);
      for (const { method, url } of endpoints) {
        const { app, reached } = buildApp();
        await request(app)[method === 'POST' ? 'post' : 'get'](url);
        const allowed = ALLOWED_AUTH_ROUTES.some(
          (route) => route.method === method && route.path.test(url),
        );
        // callback/abc is not a provider, so even the allowed route shape 404s for `abc`.
        expect(reached.length === 1).toBe(allowed);
      }
    });
  });
});
