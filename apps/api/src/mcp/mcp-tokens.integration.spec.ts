import {
  MCP_ENDPOINT,
  MCP_ERROR_MESSAGE,
  MCP_LIMIT,
  MCP_TOKEN_ACCESS,
  MCP_TOKEN_PREFIX,
  type CreateMcpTokenResponse,
  type McpTokensResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { randomUuidV7 } from '../../test-utils/isolation/random-uuid-v7';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { signInDemo } from '../../test-utils/sign-in-demo';
import { AI_ENV } from '../ai/models/ai-env.const';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { hashToken } from './tokens/hash-token';

const TOKENS = MCP_ENDPOINT.Tokens;
const tokenPath = (id: string): string => MCP_ENDPOINT.Token.replace(':id', id);
const SECRET_PATTERN = new RegExp(`^${MCP_TOKEN_PREFIX}[A-Za-z0-9_-]{43}$`);

describe('MCP tokens API', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({ env: { [AI_ENV.FullAccessEmails]: undefined } });
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
    await t.db.prisma.user.updateMany({
      where: { id: { in: [users.owner.userId, users.intruder.userId] } },
      data: { plan: 'pro' },
    });
  });

  afterEach(async () => {
    delete process.env[AI_ENV.FullAccessEmails];
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const create = async (
    agent: TestAgent = a,
    body: object = { name: 'Claude Desktop', includeNotes: false },
  ): Promise<CreateMcpTokenResponse> =>
    (await agent.post(TOKENS).send(body).expect(201)).body as CreateMcpTokenResponse;
  const list = async (agent: TestAgent = a): Promise<McpTokensResponse> =>
    (await agent.get(TOKENS).expect(200)).body as McpTokensResponse;

  it('is closed to anonymous callers', async () => {
    const nobody = anonymous(t.app);
    await nobody.get(TOKENS).expect(401);
    await nobody.post(TOKENS).send({ name: 'x', includeNotes: false }).expect(401);
    await nobody.delete(tokenPath(randomUuidV7())).expect(401);
  });

  it('creates a token, answers the secret once and stores only its digest', async () => {
    const created = await create(a, { name: '  Claude Code  ', includeNotes: true });
    expect(created.secret).toMatch(SECRET_PATTERN);
    expect(created.token).toEqual({
      id: expect.any(String),
      name: 'Claude Code',
      last4: created.secret.slice(-4),
      includeNotes: true,
      access: MCP_TOKEN_ACCESS.Read,
      createdAt: expect.any(String),
      expiresAt: null,
      lastUsedAt: null,
      callsThisWeek: 0,
    });

    const row = await t.db.prisma.mcpToken.findUniqueOrThrow({ where: { id: created.token.id } });
    expect(row.tokenHash).toBe(hashToken(created.secret));
    expect(JSON.stringify(row)).not.toContain(created.secret.slice(MCP_TOKEN_PREFIX.length));

    const listed = await list();
    expect(listed).toEqual({ available: true, items: [created.token] });
    expect(JSON.stringify(listed)).not.toContain(created.secret);
  });

  it('keeps the access level and the expiry the token was created with', async () => {
    const before = Date.now();
    const created = await create(a, {
      name: 'Cursor',
      includeNotes: false,
      access: MCP_TOKEN_ACCESS.Save,
      expiresInDays: 30,
    });
    expect(created.token.access).toBe(MCP_TOKEN_ACCESS.Save);
    const expires = Date.parse(created.token.expiresAt ?? '');
    expect(expires - before).toBeGreaterThanOrEqual(30 * 86_400_000 - 1000);
    expect(expires - before).toBeLessThanOrEqual(30 * 86_400_000 + 60_000);

    const never = await create(a, { name: 'Never', includeNotes: false, expiresInDays: null });
    expect(never.token.expiresAt).toBeNull();
    expect(never.token.access).toBe(MCP_TOKEN_ACCESS.Read);
    expect((await list()).items.map((item) => item.access)).toEqual([
      MCP_TOKEN_ACCESS.Read,
      MCP_TOKEN_ACCESS.Save,
    ]);
  });

  it('lists newest first with the calls of the last seven days', async () => {
    const first = await create(a, { name: 'One', includeNotes: false });
    const second = await create(a, { name: 'Two', includeNotes: false });
    const today = new Date();
    const day = (offset: number) => new Date(today.getTime() - offset * 86_400_000);
    await t.db.prisma.mcpTokenUsage.createMany({
      data: [
        { tokenId: first.token.id, day: day(0), calls: 3 },
        { tokenId: first.token.id, day: day(6), calls: 4 },
        { tokenId: first.token.id, day: day(7), calls: 100 },
      ],
    });
    const { items } = await list();
    expect(items.map((item) => item.name)).toEqual(['Two', 'One']);
    expect(items.map((item) => item.callsThisWeek)).toEqual([0, 7]);
    expect(items[0].id).toBe(second.token.id);
  });

  it('refuses invalid bodies', async () => {
    for (const body of [
      { name: '', includeNotes: false },
      { name: '   ', includeNotes: false },
      { name: 'x'.repeat(MCP_LIMIT.NameMax + 1), includeNotes: false },
      { name: 'bad\u0000name', includeNotes: false },
      { name: 'ok' },
      { name: 'ok', includeNotes: 'yes' },
      { name: 'ok', includeNotes: false, secret: 'mine' },
      { name: 'ok', includeNotes: false, access: 'delete' },
      { name: 'ok', includeNotes: false, expiresInDays: 7 },
      { name: 'ok', includeNotes: false, expiresInDays: '30' },
    ]) {
      await a.post(TOKENS).send(body).expect(400);
    }
    expect(await t.db.prisma.mcpToken.count()).toBe(0);
  });

  it('caps the tokens per user with a 409', async () => {
    await t.db.prisma.mcpToken.createMany({
      data: Array.from({ length: MCP_LIMIT.TokensPerUserMax }, (_, index) => ({
        userId: users.owner.userId,
        name: `T${index}`,
        tokenHash: hashToken(`seed-${index}`),
        last4: 'abcd',
      })),
    });
    const res = await a.post(TOKENS).send({ name: 'One more', includeNotes: false }).expect(409);
    expect(res.body.message).toBe(MCP_ERROR_MESSAGE.LimitReached);
    // The cap is per user: the other user can still create one.
    await create(b);
  });

  it('keeps the cap under concurrent creates', async () => {
    await t.db.prisma.mcpToken.createMany({
      data: Array.from({ length: MCP_LIMIT.TokensPerUserMax - 2 }, (_, index) => ({
        userId: users.owner.userId,
        name: `T${index}`,
        tokenHash: hashToken(`seed-${index}`),
        last4: 'abcd',
      })),
    });
    const statuses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        a.post(TOKENS).send({ name: `Race ${index}`, includeNotes: false }),
      ),
    ).then((responses) => responses.map((res) => res.status).sort());
    expect(statuses).toEqual([201, 201, 409, 409, 409]);
    expect(await t.db.prisma.mcpToken.count({ where: { userId: users.owner.userId } })).toBe(
      MCP_LIMIT.TokensPerUserMax,
    );
  });

  it('refuses accounts without Pro, but still lists and revokes their tokens', async () => {
    const created = await create();
    await t.db.prisma.user.update({ where: { id: users.owner.userId }, data: { plan: 'free' } });
    const res = await a.post(TOKENS).send({ name: 'x', includeNotes: false }).expect(403);
    expect(res.body.message).toBe(MCP_ERROR_MESSAGE.NotAvailable);
    expect(await list()).toEqual({ available: false, items: [created.token] });
    await a.delete(tokenPath(created.token.id)).expect(204);
  });

  it('gives Pro through AI_FULL_ACCESS_EMAILS for a verified email', async () => {
    await t.db.prisma.user.update({ where: { id: users.owner.userId }, data: { plan: 'free' } });
    process.env[AI_ENV.FullAccessEmails] = 'owner@example.com';
    expect((await list()).available).toBe(true);
    await create();
  });

  it('refuses demo accounts', async () => {
    const demo = await signInDemo(t.app, t.baseUrl);
    await t.db.prisma.user.update({ where: { id: demo.userId }, data: { plan: 'pro' } });
    const agent = asUser(t.app, demo);
    const res = await agent.post(TOKENS).send({ name: 'x', includeNotes: false }).expect(403);
    expect(res.body.message).toBe(MCP_ERROR_MESSAGE.DemoUser);
    expect((await list(agent)).available).toBe(false);
  });

  it('revokes a token by deleting it', async () => {
    const created = await create();
    await a.delete(tokenPath(created.token.id)).expect(204);
    expect(await t.db.prisma.mcpToken.count()).toBe(0);
    await a.delete(tokenPath(created.token.id)).expect(404);
    await a.delete(tokenPath('not-a-uuid')).expect(400);
  });

  it("isolates users: B never lists or revokes A's tokens", async () => {
    const mine = await create(a);
    const theirs = await create(b, { name: 'Theirs', includeNotes: true });

    expect((await list(a)).items.map((item) => item.id)).toEqual([mine.token.id]);
    expect((await list(b)).items.map((item) => item.id)).toEqual([theirs.token.id]);

    const foreign = await b.delete(tokenPath(mine.token.id)).expect(404);
    const missing = await b.delete(tokenPath(randomUuidV7())).expect(404);
    expect(foreign.body.message).toBe(MCP_ERROR_MESSAGE.NotFound);
    expect(missing.body.message).toBe(foreign.body.message);
    expect(await t.db.prisma.mcpToken.count({ where: { id: mine.token.id } })).toBe(1);
  });

  it('limits token writes per client', async () => {
    for (let index = 0; index < RATE_LIMIT.McpTokenWrite.limit; index++) {
      await a.delete(tokenPath(randomUuidV7())).expect(404);
    }
    await a.delete(tokenPath(randomUuidV7())).expect(429);
  });
});
