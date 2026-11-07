import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { SignedInUser } from '../models/signed-in-user.interface';
import type { TestAgent } from '../models/test-agent.interface';

function agentFor(app: NestExpressApplication, cookie: string | null): TestAgent {
  const server = app.getHttpServer();
  const withCookie = <T extends { set(name: string, value: string): T }>(test: T): T =>
    cookie === null ? test : test.set('Cookie', cookie);
  return {
    get: (path) => withCookie(request(server).get(path)),
    post: (path) => withCookie(request(server).post(path)),
    put: (path) => withCookie(request(server).put(path)),
    patch: (path) => withCookie(request(server).patch(path)),
    delete: (path) => withCookie(request(server).delete(path)),
  };
}

/** Requests as a signed-in user: every call carries that user's session cookie. */
export function asUser(app: NestExpressApplication, user: SignedInUser): TestAgent {
  return agentFor(app, user.cookie);
}

/** Requests without any cookie. */
export function anonymous(app: NestExpressApplication): TestAgent {
  return agentFor(app, null);
}
