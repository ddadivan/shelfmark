import { randomInt } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DEMO_ENDPOINT, type DemoSessionResponse } from '@shelfmark/contracts';
import request from 'supertest';
import type { SignedInDemoUser } from './models/signed-in-demo-user.interface';
import type { SignInDemoOptions } from './models/sign-in-demo-options.interface';
import { setCookiesOf, toCookieHeader } from './sign-in-as';

let nextAddress = randomInt(0, 2 ** 20);

/** A fresh private-range address per call, so each demo user has its own throttler key and quota. */
function nextSourceIp(): string {
  nextAddress += 1;
  return `10.${(nextAddress >> 16) & 255}.${(nextAddress >> 8) & 255}.${nextAddress & 255}`;
}

/**
 * Starts a demo session through the real `POST /api/demo` route (no OAuth stub involved) and returns
 * the new user id and a valid session cookie, like `signInAs` does for a regular user. Every call
 * simulates a different client address unless `sourceIp` is given, because the route is limited to
 * a few sandboxes per address.
 */
export async function signInDemo(
  app: NestExpressApplication,
  baseUrl: string,
  options: SignInDemoOptions = {},
): Promise<SignedInDemoUser> {
  const res = await request(app.getHttpServer())
    .post(DEMO_ENDPOINT.Create)
    .set('Origin', baseUrl)
    .set('X-Forwarded-For', options.sourceIp ?? nextSourceIp());
  if (res.status !== 201) {
    throw new Error(`signInDemo answered ${res.status}, expected 201`);
  }
  const body = res.body as DemoSessionResponse;
  const cookie = toCookieHeader(setCookiesOf(res));
  if (cookie === '') throw new Error('signInDemo: the response set no session cookie');
  return { userId: body.user.id, cookie, demoExpiresAt: body.user.demoExpiresAt ?? '' };
}
