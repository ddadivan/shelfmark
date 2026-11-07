import type { LinkResponse } from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';

const BASE = '/api/links';
const ROUNDS = 8;

// Test-level retries (2) exist for one harness artifact only: PGlite's socket server multiplexes
// parallel connections onto a single instance and now and then answers "unnamed prepared statement
// does not exist" (P2039) to the session lookup. The unified error format hides the cause, so the
// failure cannot be matched per request; retrying a mutating request is also unsafe. A retry re-runs
// the whole test on a clean database. This is not a Postgres behaviour: on a real server the
// invariants asserted here are deterministic.
describe('links API: concurrency', { retry: 2 }, () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('offline'));
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  it('two parallel creates with one idempotency key make one link', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const key = `018f0000-0000-7000-8000-${String(round).padStart(12, '0')}`;
      const send = () =>
        a.post(BASE).send({ url: `https://race.test/${round}`, title: 't', idempotencyKey: key });
      const [first, second] = await Promise.all([send(), send()]);
      expect([first.status, second.status].sort()).toEqual([200, 201]);
      expect((first.body as LinkResponse).id).toBe((second.body as LinkResponse).id);
      expect(await t.db.prisma.link.count({ where: { idempotencyKey: key } })).toBe(1);
    }
  });

  it('a create racing a delete-links of its folder never leaves a stray link', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const folder = await t.db.prisma.folder.create({
        data: { userId: users.owner.userId, name: `F${round}` },
      });
      await seedLink(t.db.prisma, users.owner.userId, { folderId: folder.id });
      const [created, deleted] = await Promise.all([
        a.post(BASE).send({ url: `https://race.test/${round}`, title: 't', folderId: folder.id }),
        a.delete(`/api/folders/${folder.id}?mode=delete-links`),
      ]);
      expect(deleted.status).toBe(204);
      expect([201, 404]).toContain(created.status);
      // Whichever order won, no link of the deleted folder survives as "Unsorted".
      expect(await t.db.prisma.link.count({ where: { userId: users.owner.userId } })).toBe(0);
    }
  });

  it('parallel creates with the same new tag make one tag and tag both links', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const name = `fresh-${round}`;
      const send = (n: number) =>
        a.post(BASE).send({ url: `https://race.test/${round}/${n}`, title: 't', tags: [name] });
      const responses = await Promise.all([send(1), send(2), send(3)]);
      for (const response of responses) {
        expect(response.status).toBe(201);
        expect((response.body as LinkResponse).tags).toEqual([name]);
      }
      const tags = await t.db.prisma.tag.findMany({
        where: { userId: users.owner.userId, name },
      });
      expect(tags).toHaveLength(1);
    }
  });

  it('a tag replacement racing a merge ends consistent', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const id = await seedLink(t.db.prisma, users.owner.userId, {
        tags: [`src-${round}`, `dst-${round}`],
      });
      const source = await t.db.prisma.tag.findFirstOrThrow({
        where: { userId: users.owner.userId, name: `src-${round}` },
      });
      const target = await t.db.prisma.tag.findFirstOrThrow({
        where: { userId: users.owner.userId, name: `dst-${round}` },
      });
      const [patched, merged] = await Promise.all([
        a.patch(`${BASE}/${id}`).send({ tags: [`src-${round}`, 'extra'] }),
        a.post(`/api/tags/${source.id}/merge`).send({ targetTagId: target.id }),
      ]);
      expect([200, 409]).toContain(patched.status);
      expect([200, 404]).toContain(merged.status);
      // No dangling state: the source tag is gone after a successful merge, and no link tag row
      // points at a tag that does not exist (the foreign keys guarantee it, a 5xx would not).
      if (merged.status === 200) {
        expect(await t.db.prisma.tag.count({ where: { id: source.id } })).toBe(0);
      }
      const rows = await t.db.prisma.linkTag.findMany({ where: { linkId: id } });
      expect(rows.length).toBeGreaterThan(0);
    }
  });

  it('parallel PATCH and DELETE of one link are 200/404 and never 5xx', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const id = await seedLink(t.db.prisma, users.owner.userId, { tags: ['t'] });
      const [patched, deleted] = await Promise.all([
        a.patch(`${BASE}/${id}`).send({ title: 'new', tags: ['t', 'u'] }),
        a.delete(`${BASE}/${id}`),
      ]);
      expect([200, 404, 409]).toContain(patched.status);
      expect(deleted.status).toBe(204);
      expect(await t.db.prisma.link.count({ where: { id } })).toBe(0);
    }
  });
});
