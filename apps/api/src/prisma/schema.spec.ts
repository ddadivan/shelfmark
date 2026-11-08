import { createTestDatabase } from '../../test-utils/test-database';
import type { TestDatabase } from '../../test-utils/models/test-database.interface';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const IN_ONE_HOUR = () => new Date(Date.now() + 3_600_000);

describe('Prisma schema (migrations applied to an in-memory PGlite)', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.truncateAll();
  });

  afterAll(async () => {
    await database.close();
  });

  it('creates a user with defaults and a UUID v7 id', async () => {
    const user = await database.prisma.user.create({
      data: { name: 'Ada', email: 'ada@example.test' },
    });
    expect(user.id).toMatch(UUID_V7);
    expect(user.emailVerified).toBe(false);
    expect(user.isDemo).toBe(false);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects a duplicate email', async () => {
    const data = { name: 'Ada', email: 'dup@example.test' };
    await database.prisma.user.create({ data });
    await expect(database.prisma.user.create({ data })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects a session for a missing user', async () => {
    await expect(
      database.prisma.session.create({
        data: {
          token: 't',
          expiresAt: IN_ONE_HOUR(),
          userId: '01990000-0000-7000-8000-000000000000',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('cascades the deletion of a user to sessions and accounts', async () => {
    const user = await database.prisma.user.create({
      data: {
        name: 'Grace',
        email: 'grace@example.test',
        sessions: { create: { token: 'session-token', expiresAt: IN_ONE_HOUR() } },
        accounts: { create: { accountId: 'g-1', providerId: 'github' } },
      },
    });
    await database.prisma.user.delete({ where: { id: user.id } });
    expect(await database.prisma.session.count()).toBe(0);
    expect(await database.prisma.account.count()).toBe(0);
  });

  it('keeps provider accounts unique per provider', async () => {
    const user = await database.prisma.user.create({
      data: { name: 'Linus', email: 'linus@example.test' },
    });
    const data = { accountId: 'x', providerId: 'google', userId: user.id };
    await database.prisma.account.create({ data });
    await expect(database.prisma.account.create({ data })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('stores verification tokens', async () => {
    const row = await database.prisma.verification.create({
      data: { identifier: 'a@example.test', value: 'v', expiresAt: IN_ONE_HOUR() },
    });
    expect(row.id).toMatch(UUID_V7);
  });

  it('truncateAll empties every table', async () => {
    await database.prisma.user.create({ data: { name: 'T', email: 't@example.test' } });
    await database.truncateAll();
    expect(await database.prisma.user.count()).toBe(0);
  });
});
