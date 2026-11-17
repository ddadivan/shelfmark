import { createTestDatabase } from '../../test-utils/test-database';
import type { TestDatabase } from '../../test-utils/models/test-database.interface';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

describe('MCP schema (#395)', () => {
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

  const createUser = (email = 'ada@example.test') =>
    database.prisma.user.create({ data: { name: 'Ada', email } });

  const createToken = (userId: string, data: { tokenHash?: string; name?: string } = {}) =>
    database.prisma.mcpToken.create({
      data: {
        userId,
        name: data.name ?? 'Claude',
        tokenHash: data.tokenHash ?? HASH_A,
        last4: 'Ab_-',
      },
    });

  it('stores a token with notes off and never used', async () => {
    const user = await createUser();
    const token = await createToken(user.id);
    expect(token).toMatchObject({ includeNotes: false, lastUsedAt: null, last4: 'Ab_-' });
  });

  it('keeps token digests unique across users', async () => {
    const ada = await createUser();
    const bob = await createUser('bob@example.test');
    await createToken(ada.id);
    await expect(createToken(bob.id)).rejects.toThrow();
    await expect(createToken(bob.id, { tokenHash: HASH_B })).resolves.toBeDefined();
  });

  it('rejects a blank name, a digest that is not lower-case hex and a bad last4', async () => {
    const user = await createUser();
    await expect(createToken(user.id, { name: '   ' })).rejects.toThrow();
    await expect(createToken(user.id, { tokenHash: 'A'.repeat(64) })).rejects.toThrow();
    await expect(
      database.prisma.mcpToken.create({
        data: { userId: user.id, name: 'x', tokenHash: HASH_A, last4: 'ab c' },
      }),
    ).rejects.toThrow();
  });

  it('counts calls per token and day, never below zero', async () => {
    const user = await createUser();
    const token = await createToken(user.id);
    const day = new Date('2026-12-02');
    await database.prisma.mcpTokenUsage.create({ data: { tokenId: token.id, day, calls: 3 } });
    await expect(
      database.prisma.mcpTokenUsage.create({ data: { tokenId: token.id, day } }),
    ).rejects.toThrow();
    await expect(
      database.prisma.mcpTokenUsage.create({
        data: { tokenId: token.id, day: new Date('2026-12-03'), calls: -1 },
      }),
    ).rejects.toThrow();
  });

  it('deletes usage with its token and tokens with their user', async () => {
    const user = await createUser();
    const token = await createToken(user.id);
    await database.prisma.mcpTokenUsage.create({
      data: { tokenId: token.id, day: new Date('2026-12-02'), calls: 1 },
    });
    await database.prisma.mcpToken.delete({ where: { id: token.id } });
    expect(await database.prisma.mcpTokenUsage.count()).toBe(0);

    await createToken(user.id, { tokenHash: HASH_B });
    await database.prisma.user.delete({ where: { id: user.id } });
    expect(await database.prisma.mcpToken.count()).toBe(0);
  });
});
