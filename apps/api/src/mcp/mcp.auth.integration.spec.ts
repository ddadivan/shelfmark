import { randomBytes } from 'node:crypto';
import { MCP_ENDPOINT, MCP_ERROR_MESSAGE, MCP_LIMIT, MCP_TOKEN_PREFIX } from '@shelfmark/contracts';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { SeededMcpToken } from '../../test-utils/models/seeded-mcp-token.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedMcpToken } from '../../test-utils/seed-mcp-token';
import { signInDemo } from '../../test-utils/sign-in-demo';
import { AI_ENV } from '../ai/models/ai-env.const';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { MCP_USAGE_OUTCOME } from './models/mcp-usage-outcome.const';
import { McpUsageService } from './usage/mcp-usage.service';

const SERVER = MCP_ENDPOINT.Server;
const PING = { jsonrpc: '2.0', id: 1, method: 'ping' };
const API_ERROR_KEYS = ['error', 'message', 'requestId', 'statusCode'];
const WWW_AUTHENTICATE = 'Bearer realm="shelfmark"';
const NO_STORE = 'no-store';

describe('MCP server authentication', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let token: SeededMcpToken;

  beforeAll(async () => {
    t = await createAuthTestApp({ env: { [AI_ENV.FullAccessEmails]: undefined } });
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    await t.db.prisma.user.update({ where: { id: users.owner.userId }, data: { plan: 'pro' } });
    token = await seedMcpToken(t.db.prisma, users.owner.userId);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const post = (authorization?: string) => {
    const test = request(t.app.getHttpServer()).post(SERVER);
    return authorization === undefined ? test : test.set('Authorization', authorization);
  };
  const bearer = (secret: string = token.secret) => `Bearer ${secret}`;

  const expectUnauthorized = (res: request.Response) => {
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe(WWW_AUTHENTICATE);
    expect(res.headers['cache-control']).toBe(NO_STORE);
    expect(Object.keys(res.body).sort()).toEqual(API_ERROR_KEYS);
    expect(res.body.message).toBe(MCP_ERROR_MESSAGE.Unauthorized);
  };

  it('answers a ping for a valid token', async () => {
    const res = await post(bearer()).send(PING).expect(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ jsonrpc: '2.0', id: 1, result: {} });
  });

  it('is a 401 without a token', async () => {
    expectUnauthorized(await post().send(PING));
  });

  it('never accepts the session cookie', async () => {
    expectUnauthorized(await post().set('Cookie', users.owner.cookie).send(PING));
    await post(bearer()).set('Cookie', users.intruder.cookie).send(PING).expect(200);
  });

  it('is a 401 for malformed, unknown and revoked tokens', async () => {
    const unknown = `${MCP_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    for (const header of [
      'Bearer',
      `Basic ${token.secret}`,
      token.secret,
      bearer(token.secret.slice(0, -1)),
      bearer(`${token.secret}x`),
      bearer(unknown),
    ]) {
      expectUnauthorized(await post(header).send(PING));
    }

    await request(t.app.getHttpServer())
      .delete(MCP_ENDPOINT.Token.replace(':id', token.id))
      .set('Cookie', users.owner.cookie)
      .expect(204);
    expectUnauthorized(await post(bearer()).send(PING));
  });

  it('is a 403 for an account without Pro or after a downgrade', async () => {
    await t.db.prisma.user.update({ where: { id: users.owner.userId }, data: { plan: 'free' } });
    const res = await post(bearer()).send(PING).expect(403);
    expect(res.body.message).toBe(MCP_ERROR_MESSAGE.NotAvailable);
    expect(res.headers['cache-control']).toBe(NO_STORE);
    expect(await t.db.prisma.mcpTokenUsage.count()).toBe(0);
  });

  it('is a 403 for a demo account', async () => {
    const demo = await signInDemo(t.app, t.baseUrl);
    await t.db.prisma.user.update({ where: { id: demo.userId }, data: { plan: 'pro' } });
    const demoToken = await seedMcpToken(t.db.prisma, demo.userId);
    const res = await post(bearer(demoToken.secret)).send(PING).expect(403);
    expect(res.body.message).toBe(MCP_ERROR_MESSAGE.DemoUser);
  });

  it('counts calls and answers 429 with Retry-After past the daily cap', async () => {
    await post(bearer()).send(PING).expect(200);
    const row = await t.db.prisma.mcpTokenUsage.findFirstOrThrow({ where: { tokenId: token.id } });
    expect(row.calls).toBe(1);
    const used = await t.db.prisma.mcpToken.findUniqueOrThrow({ where: { id: token.id } });
    expect(used.lastUsedAt).not.toBeNull();

    await t.db.prisma.mcpTokenUsage.update({
      where: { tokenId_day: { tokenId: token.id, day: row.day } },
      data: { calls: MCP_LIMIT.CallsPerTokenPerDay },
    });
    const res = await post(bearer()).send(PING).expect(429);
    expect(res.body.message).toBe(MCP_ERROR_MESSAGE.DailyCapReached);
    expect(res.headers['cache-control']).toBe(NO_STORE);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(res.headers['retry-after'])).toBeLessThanOrEqual(86_400);
  });

  it.each(['get', 'delete'] as const)('answers %s with 405 and Allow: POST', async (method) => {
    const res = await request(t.app.getHttpServer())[method](SERVER).expect(405);
    expect(res.headers['allow']).toBe('POST');
    expect(res.headers['cache-control']).toBe(NO_STORE);
    expect(res.text).toBe('');
  });

  it('keeps the CSRF checks: a foreign Origin is 403, no Origin passes, text/plain is 415', async () => {
    await post(bearer()).set('Origin', 'https://evil.example').send(PING).expect(403);
    await post(bearer()).set('Origin', t.baseUrl).send(PING).expect(200);
    await post(bearer()).set('Content-Type', 'text/plain').send(JSON.stringify(PING)).expect(415);
  });

  it('answers notifications and client responses with 202 and no body', async () => {
    const notification = await post(bearer())
      .send({ jsonrpc: '2.0', method: 'notifications/initialized' })
      .expect(202);
    expect(notification.text).toBe('');
    const oddParams = await post(bearer())
      .send({ jsonrpc: '2.0', method: 'notifications/cancelled', params: [1] })
      .expect(202);
    expect(oddParams.text).toBe('');
    await post(bearer()).send({ jsonrpc: '2.0', id: 9, result: {} }).expect(202);
  });

  it('answers malformed JSON with -32700 after the token check', async () => {
    expectUnauthorized(await post().set('Content-Type', 'application/json').send('{"jsonrpc":'));
    const res = await post(bearer())
      .set('Content-Type', 'application/json')
      .send('{"jsonrpc":')
      .expect(200);
    expect(res.body).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    });
  });

  it('answers an unknown method with -32601', async () => {
    const res = await post(bearer())
      .send({ jsonrpc: '2.0', id: 'a', method: 'resources/list' })
      .expect(200);
    expect(res.body).toEqual({
      jsonrpc: '2.0',
      id: 'a',
      error: { code: -32601, message: 'Method not found' },
    });
  });

  it('limits requests per client before the token check', async () => {
    for (let index = 0; index < RATE_LIMIT.Mcp.limit; index++) {
      await post().send(PING).expect(401);
    }
    const limited = await post(bearer()).send(PING).expect(429);
    expect(limited.headers['cache-control']).toBe(NO_STORE);
  });

  it('initializes with a negotiated version and refuses an unsupported version header', async () => {
    const res = await post(bearer())
      .send({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05' },
      })
      .expect(200);
    expect(res.body.result.protocolVersion).toBe('2025-11-25');
    expect(res.body.result.capabilities).toEqual({ tools: { listChanged: false } });
    expect(res.headers['mcp-session-id']).toBeUndefined();

    await post(bearer()).set('MCP-Protocol-Version', '2025-06-18').send(PING).expect(200);
    const callsBefore = await t.db.prisma.mcpTokenUsage.aggregate({ _sum: { calls: true } });
    const refused = await post(bearer()).set('MCP-Protocol-Version', '1999-01-01').send(PING);
    expect(refused.status).toBe(400);
    expect(Object.keys(refused.body).sort()).toEqual(API_ERROR_KEYS);
    expect(refused.headers['cache-control']).toBe(NO_STORE);
    // A refused version does not use up the daily cap.
    const callsAfter = await t.db.prisma.mcpTokenUsage.aggregate({ _sum: { calls: true } });
    expect(callsAfter._sum.calls).toBe(callsBefore._sum.calls);
    // 2025-03-26 requires batches, which are refused: not offered.
    await post(bearer()).set('MCP-Protocol-Version', '2025-03-26').send(PING).expect(400);
  });

  it('is a 401 when the token is revoked while the call is checked', async () => {
    vi.spyOn(t.app.get(McpUsageService), 'reserve').mockResolvedValue({
      kind: MCP_USAGE_OUTCOME.Revoked,
    });
    expectUnauthorized(await post(bearer()).send(PING));
  });

  it('answers a body just over 100kb with 413, without counting', async () => {
    const padding = 'x'.repeat(100 * 1024);
    const res = await post(bearer())
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ ...PING, params: { padding } }))
      .expect(413);
    expect(res.headers['cache-control']).toBe(NO_STORE);
    expect(await t.db.prisma.mcpTokenUsage.count()).toBe(0);
  });

  it('refuses batches with -32600', async () => {
    const res = await post(bearer()).send([PING, PING]).expect(200);
    expect(res.body).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Batches are not supported' },
    });
  });
});
