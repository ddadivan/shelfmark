import { TAG_LIMIT } from '@shelfmark/contracts';
import type { ListTagsResponse, TagResponse } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { randomUuidV7 } from '../../test-utils/isolation/random-uuid-v7';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { TagsService } from './tags.service';

describe('Tags API', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let owner: TestAgent;
  let intruder: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    users = await createIsolationUsers(t);
    owner = asUser(t.app, users.owner);
    intruder = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const createTag = async (agent: TestAgent, name: string): Promise<TagResponse> =>
    (await agent.post('/api/tags').send({ name }).expect(201)).body as TagResponse;

  const createLink = (userId: string, n: number) =>
    t.db.prisma.link.create({
      data: {
        userId,
        url: `https://example.test/${n}`,
        normalizedUrl: `https://example.test/${n}`,
        title: `Link ${n}`,
        titleSortKey: `link ${n}`,
      },
    });

  const attach = (linkId: string, tagId: string) =>
    t.db.prisma.linkTag.create({ data: { linkId, tagId } });

  const listTags = async (agent: TestAgent): Promise<TagResponse[]> =>
    ((await agent.get('/api/tags').expect(200)).body as ListTagsResponse).items;

  it('creates a tag and normalizes spaces to hyphens', async () => {
    const tag = await createTag(owner, '  to   read  later ');
    expect(tag).toMatchObject({ name: 'to-read-later', linkCount: 0 });
    expect(tag.id).toBeTruthy();
  });

  it.each([[''], ['   '], ['a'.repeat(TAG_LIMIT.NameMax + 1)], [42 as unknown as string]])(
    'rejects an invalid name %j with 400',
    async (name) => {
      await owner.post('/api/tags').send({ name }).expect(400);
    },
  );

  it('rejects unknown body fields', async () => {
    await owner.post('/api/tags').send({ name: 'a', userId: 'x' }).expect(400);
  });

  it('answers 409 for a duplicate name regardless of case', async () => {
    await createTag(owner, 'Reading');
    const res = await owner.post('/api/tags').send({ name: 'reading' }).expect(409);
    expect(res.body).toMatchObject({ statusCode: 409, error: 'Conflict' });
  });

  it('lets another user use the same name', async () => {
    await createTag(owner, 'reading');
    await createTag(intruder, 'reading');
  });

  it('answers 409 at the per-user limit', async () => {
    await t.db.prisma.tag.createMany({
      data: Array.from({ length: TAG_LIMIT.PerUserMax }, (_, i) => ({
        userId: users.owner.userId,
        name: `t${i}`,
      })),
    });
    await owner.post('/api/tags').send({ name: 'one-more' }).expect(409);
  });

  it('lists tags with the count of own links, by count then name', async () => {
    const [b, a, c] = [
      await createTag(owner, 'b'),
      await createTag(owner, 'a'),
      await createTag(owner, 'c'),
    ];
    const [l1, l2] = [
      await createLink(users.owner.userId, 1),
      await createLink(users.owner.userId, 2),
    ];
    await attach(l1.id, c.id);
    await attach(l2.id, c.id);
    await attach(l1.id, b.id);
    const items = await listTags(owner);
    expect(items.map((x) => [x.name, x.linkCount])).toEqual([
      ['c', 2],
      ['b', 1],
      ['a', 0],
    ]);
    expect(a.linkCount).toBe(0);
  });

  it('ignores links of another user in the counts', async () => {
    const tag = await createTag(owner, 'shared');
    const foreign = await createLink(users.intruder.userId, 1);
    await attach(foreign.id, tag.id);
    expect((await listTags(owner))[0]?.linkCount).toBe(0);
  });

  it('renames a tag and normalizes the new name', async () => {
    const tag = await createTag(owner, 'old');
    const res = await owner.patch(`/api/tags/${tag.id}`).send({ name: 'new name' }).expect(200);
    expect(res.body).toMatchObject({ id: tag.id, name: 'new-name' });
  });

  it('allows a case-only rename of the same tag', async () => {
    const tag = await createTag(owner, 'reading');
    const res = await owner.patch(`/api/tags/${tag.id}`).send({ name: 'Reading' }).expect(200);
    expect(res.body).toMatchObject({ name: 'Reading' });
  });

  it('answers 409 when renaming onto another tag, case-insensitively', async () => {
    await createTag(owner, 'Reading');
    const other = await createTag(owner, 'other');
    await owner.patch(`/api/tags/${other.id}`).send({ name: 'READING' }).expect(409);
  });

  it('rejects an invalid id with 400 and a blank rename with 400', async () => {
    await owner.patch('/api/tags/not-a-uuid').send({ name: 'x' }).expect(400);
    const tag = await createTag(owner, 'x');
    await owner.patch(`/api/tags/${tag.id}`).send({ name: ' ' }).expect(400);
  });

  it('deletes a tag and keeps its links', async () => {
    const tag = await createTag(owner, 'gone');
    const link = await createLink(users.owner.userId, 1);
    await attach(link.id, tag.id);
    await owner.delete(`/api/tags/${tag.id}`).expect(204);
    expect(await t.db.prisma.link.count({ where: { id: link.id } })).toBe(1);
    expect(await t.db.prisma.linkTag.count()).toBe(0);
    await owner.get(`/api/tags/${tag.id}`).expect(404);
  });

  describe('merge', () => {
    it('moves links, handles links that have both tags, and deletes the source', async () => {
      const source = await createTag(owner, 'src');
      const target = await createTag(owner, 'dst');
      const [onlySource, both, onlyTarget] = [
        await createLink(users.owner.userId, 1),
        await createLink(users.owner.userId, 2),
        await createLink(users.owner.userId, 3),
      ];
      await attach(onlySource.id, source.id);
      await attach(both.id, source.id);
      await attach(both.id, target.id);
      await attach(onlyTarget.id, target.id);

      const res = await owner
        .post(`/api/tags/${source.id}/merge`)
        .send({ targetTagId: target.id })
        .expect(200);
      expect(res.body).toMatchObject({ id: target.id, name: 'dst', linkCount: 3 });
      expect((await listTags(owner)).map((x) => x.id)).toEqual([target.id]);
      expect(await t.db.prisma.link.count()).toBe(3);
    });

    it('does not move a foreign link attached to the source tag', async () => {
      const source = await createTag(owner, 'src');
      const target = await createTag(owner, 'dst');
      const mine = await createLink(users.owner.userId, 1);
      const foreign = await createLink(users.intruder.userId, 2);
      await attach(mine.id, source.id);
      await attach(foreign.id, source.id);

      await owner.post(`/api/tags/${source.id}/merge`).send({ targetTagId: target.id }).expect(200);

      const rows = await t.db.prisma.linkTag.findMany({ where: { tagId: target.id } });
      expect(rows.map((r) => r.linkId)).toEqual([mine.id]);
    });

    it('answers 400 when merging a tag into itself', async () => {
      const tag = await createTag(owner, 'self');
      await owner.post(`/api/tags/${tag.id}/merge`).send({ targetTagId: tag.id }).expect(400);
      await owner.get(`/api/tags/${tag.id}`).expect(200);
    });

    it('answers 404 for a foreign source or target and changes nothing', async () => {
      const mine = await createTag(owner, 'mine');
      const theirs = await createTag(intruder, 'theirs');
      const link = await createLink(users.intruder.userId, 1);
      await attach(link.id, theirs.id);

      await owner.post(`/api/tags/${theirs.id}/merge`).send({ targetTagId: mine.id }).expect(404);
      await owner.post(`/api/tags/${mine.id}/merge`).send({ targetTagId: theirs.id }).expect(404);
      await owner.post(`/api/tags/${theirs.id}/merge`).send({ targetTagId: theirs.id }).expect(404);
      await owner
        .post(`/api/tags/${mine.id}/merge`)
        .send({ targetTagId: randomUuidV7() })
        .expect(404);

      expect(await listTags(intruder)).toMatchObject([{ id: theirs.id, linkCount: 1 }]);
      expect(await listTags(owner)).toMatchObject([{ id: mine.id }]);
    });

    it('validates the body', async () => {
      const tag = await createTag(owner, 'x');
      await owner.post(`/api/tags/${tag.id}/merge`).send({ targetTagId: 'nope' }).expect(400);
    });
  });

  it('is closed to anonymous callers', async () => {
    await anonymous(t.app).get('/api/tags').expect(401);
  });

  it('isolates tags between users', async () => {
    await expectIsolated(t.app, users, {
      create: async (a) => (await createTag(a, 'private')).id,
      read: (u, id) => u.get(`/api/tags/${id}`),
      update: (u, id) => u.patch(`/api/tags/${id}`).send({ name: 'renamed' }),
      remove: (u, id) => u.delete(`/api/tags/${id}`),
      list: {
        request: (u) => u.get('/api/tags'),
        ids: (b) => (b as ListTagsResponse).items.map((x) => x.id),
      },
      reference: (u, id) => u.post(`/api/tags/${id}/merge`).send({ targetTagId: id }),
    });
  });

  describe('resolveNames', () => {
    const service = (): TagsService => new TagsService(t.db.prisma);

    it('normalizes, de-duplicates case-insensitively, reuses and creates', async () => {
      const existing = await createTag(owner, 'Reading');
      const ids = await service().resolveNames(
        users.owner.userId,
        ['reading', 'to read', 'To-Read', '  ', 'new'],
        t.db.prisma,
      );
      expect(ids).toHaveLength(3);
      expect(ids[0]).toBe(existing.id);
      const names = (await listTags(owner)).map((x) => x.name).sort();
      expect(names).toEqual(['Reading', 'new', 'to-read']);
    });

    it('resolves every non-ASCII name the way the database matches it', async () => {
      const existing = await createTag(owner, 'Éclair');
      const ids = await service().resolveNames(
        users.owner.userId,
        ['éclair', 'ÉCLAIR', 'straße', 'ПРИВЕТ'],
        t.db.prisma,
      );
      // Nothing is dropped: one id per distinct tag, and the same call again is stable.
      const again = await service().resolveNames(
        users.owner.userId,
        ['éclair', 'ÉCLAIR', 'straße', 'ПРИВЕТ'],
        t.db.prisma,
      );
      expect(again).toEqual(ids);
      expect(ids.length).toBeGreaterThanOrEqual(3);
      expect(ids.every((id) => typeof id === 'string')).toBe(true);
      expect(await t.db.prisma.tag.findUnique({ where: { id: existing.id } })).not.toBeNull();
    });

    it('returns nothing for no names, works in a transaction and scopes by user', async () => {
      expect(await service().resolveNames(users.owner.userId, [' '], t.db.prisma)).toEqual([]);
      await createTag(intruder, 'shared');
      const [id] = await t.db.prisma.$transaction((tx) =>
        service().resolveNames(users.owner.userId, ['shared'], tx),
      );
      const tag = await t.db.prisma.tag.findUniqueOrThrow({ where: { id } });
      expect(tag.userId).toBe(users.owner.userId);
    });

    it('rejects a too long name (400) and exceeding the limit (409)', async () => {
      await expect(
        service().resolveNames(
          users.owner.userId,
          ['a'.repeat(TAG_LIMIT.NameMax + 1)],
          t.db.prisma,
        ),
      ).rejects.toMatchObject({ status: 400 });
      await t.db.prisma.tag.createMany({
        data: Array.from({ length: TAG_LIMIT.PerUserMax }, (_, i) => ({
          userId: users.owner.userId,
          name: `t${i}`,
        })),
      });
      await expect(
        service().resolveNames(users.owner.userId, ['extra'], t.db.prisma),
      ).rejects.toMatchObject({ status: 409 });
    });
  });
});
