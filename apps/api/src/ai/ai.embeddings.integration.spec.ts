import { Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import {
  AI_ENDPOINT,
  AI_QUOTA,
  type AiSettingsResponse,
  type AiTickResponse,
} from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { CRON_ENV } from '../demo/models/cron-env.const';
import { AiBackgroundService } from './background/ai-background.service';
import { AiEmbedService } from './embeddings/ai-embed.service';
import { markEmbeddingsStale } from './embeddings/mark-embeddings-stale';
import { AiExcerptService } from './excerpt/ai-excerpt.service';
import { AI_EMBED_LIMIT } from './models/ai-embed-limit.const';
import { AI_ENV } from './models/ai-env.const';
import type { EmbedOutcome } from './models/embed-outcome.type';
import { EMBEDDING_LIMIT } from './models/embedding-limit.const';
import type { EmbeddingInputType } from './models/embedding-input-type.type';
import { AiProviderRegistry } from './providers/ai-provider.registry';

const SECRET = randomBytes(24).toString('hex');
const PAGE = { excerpt: 'Visible page text', description: 'From the page' };

/** A valid unit vector of the column's length, pointing along `axis`. */
const vectorOf = (axis: number): number[] =>
  Array.from({ length: EMBEDDING_LIMIT.Dimensions }, (_, i) => (i === axis ? 1 : 0));

interface EmbeddingRow {
  linkId: string;
  stale: boolean;
  model: string;
  withNote: boolean;
}

describe('AI embeddings: the embed pass, stale hooks and status (AI-3)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  const deferrer = new AwaitableDeferrer();
  const excerpts = { load: vi.fn(() => Promise.resolve(PAGE)) };

  beforeAll(async () => {
    t = await createAuthTestApp({
      env: { [AI_ENV.FullAccessEmails]: undefined, [CRON_ENV.Secret]: SECRET },
      overrides: [
        { provide: AiBackgroundService, useValue: deferrer },
        { provide: AiExcerptService, useValue: excerpts },
      ],
    });
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    deferrer.clear();
    vi.restoreAllMocks();
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const owner = (): string => users.owner.userId;
  const intruder = (): string => users.intruder.userId;
  const provider = () => t.app.get(AiProviderRegistry).embeddingsFor({ isDemo: false });
  /** Spies on the mock provider; `texts` collects every text it was sent. */
  const spyEmbed = (answer?: (texts: readonly string[]) => Promise<EmbedOutcome>) => {
    const original = provider().embed.bind(provider());
    const texts: string[] = [];
    const spy = vi
      .spyOn(provider(), 'embed')
      .mockImplementation((input: readonly string[], type: EmbeddingInputType) => {
        texts.push(...input);
        return answer ? answer(input) : original(input, type);
      });
    return { spy, texts };
  };
  const turnOn = async (agent: TestAgent = a, settings: object = {}) => {
    const res = await agent
      .patch(AI_ENDPOINT.Settings)
      .send({ enabled: true, summaries: false, folderMode: 'off', tagsMode: 'off', ...settings })
      .expect(200);
    return res.body as AiSettingsResponse;
  };
  const settings = async (agent: TestAgent = a) =>
    (await agent.get(AI_ENDPOINT.Settings).expect(200)).body as AiSettingsResponse;
  const rows = (userId: string) =>
    t.db.prisma.$queryRaw<EmbeddingRow[]>`
      SELECT link_id::text AS "linkId", stale, model, with_note AS "withNote"
      FROM link_embeddings WHERE user_id = ${userId}::uuid ORDER BY link_id`;
  const run = (userId: string = owner()) => t.app.get(AiEmbedService).run(userId, 10_000);
  const embedsUsed = async (userId: string = owner()) =>
    (await t.db.prisma.aiUsage.findFirst({ where: { userId }, select: { embeds: true } }))
      ?.embeds ?? 0;
  const embedAll = async () => {
    await turnOn();
    await deferrer.flush();
  };

  describe('the pass', () => {
    it('embeds every live link once the switch is on and counts the embeddings', async () => {
      const first = await seedLink(t.db.prisma, owner(), { title: 'Winter coat', tags: ['wear'] });
      const second = await seedLink(t.db.prisma, owner(), { title: 'Ramen in Tokyo' });
      const trashed = await seedLink(t.db.prisma, owner(), { title: 'Old thing' });
      await t.db.prisma.link.update({ where: { id: trashed }, data: { deletedAt: new Date() } });
      const { spy, texts } = spyEmbed();

      const on = await turnOn();
      expect(on.settings.meaningSearch).toBe(true);
      expect(deferrer.size).toBe(1);
      await deferrer.flush();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.any(Array), 'document');
      expect(texts.sort()).toEqual(['Title: Ramen in Tokyo', 'Title: Winter coat\nTags: wear']);
      expect((await rows(owner())).map((row) => row.linkId).sort()).toEqual([first, second].sort());
      expect(await rows(owner())).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stale: false, model: 'mock-embed-1', withNote: false }),
        ]),
      );
      expect(await embedsUsed()).toBe(2);
      expect((await settings()).search).toEqual({ state: 'ready', ready: 2, total: 2 });
      const lease = await t.db.prisma.aiSettings.findUniqueOrThrow({
        where: { userId: owner() },
        select: { embedLeaseUntil: true },
      });
      expect(lease.embedLeaseUntil).toBeNull();
    });

    it('rebuilds stale, other-model and note-mismatch vectors and never pays for an unchanged text', async () => {
      const plain = await seedLink(t.db.prisma, owner(), { title: 'Plain' });
      const noted = await seedLink(t.db.prisma, owner(), { title: 'Noted', note: 'my thoughts' });
      const other = await seedLink(t.db.prisma, owner(), { title: 'Other' });
      await embedAll();
      const { spy, texts } = spyEmbed();

      // An edit to the title: stale, re-embedded after the response.
      await a.patch(`/api/links/${plain}`).send({ title: 'Plain, renamed' }).expect(200);
      expect((await rows(owner())).find((row) => row.linkId === plain)?.stale).toBe(true);
      await deferrer.flush();
      expect(texts).toEqual(['Title: Plain, renamed']);

      // A vector of another model.
      await t.db.prisma.$executeRaw`
        UPDATE link_embeddings SET model = 'older-model' WHERE link_id = ${other}::uuid`;
      await run();
      expect(texts).toEqual(['Title: Plain, renamed', 'Title: Other']);

      // The note switch: only the link with a note costs a call; the others just flip with_note.
      await turnOn(a, { includeNotes: true });
      await deferrer.flush();
      expect(texts.at(-1)).toBe('Title: Noted\nNote: my thoughts');
      expect(spy).toHaveBeenCalledTimes(3);
      expect((await rows(owner())).every((row) => row.withNote && !row.stale)).toBe(true);

      // The same title again: stale, but the text is unchanged, so no call.
      await a.patch(`/api/links/${plain}`).send({ title: 'Plain, renamed' }).expect(200);
      await deferrer.flush();
      expect(spy).toHaveBeenCalledTimes(3);
      expect((await rows(owner())).find((row) => row.linkId === plain)?.stale).toBe(false);
      expect(await embedsUsed()).toBe(3 + 3);
      expect(noted).toBeDefined();
    });

    it('skips a link whose link job is pending and embeds it after the job', async () => {
      await embedAll();
      await turnOn(a, { summaries: true });
      const saved = (
        await a
          .post('/api/links')
          .send({ url: 'https://example.com/a', title: 'Fresh' })
          .expect(201)
      ).body as { id: string };
      expect(deferrer.size).toBe(1);
      await run();
      expect(await rows(owner())).toEqual([]);
      await deferrer.flush();
      expect((await rows(owner())).map((row) => row.linkId)).toEqual([saved.id]);
    });

    it('embeds a link saved without a job right after the response', async () => {
      await embedAll();
      const saved = (
        await a
          .post('/api/links')
          .send({ url: 'https://example.com/b', title: 'Fresh' })
          .expect(201)
      ).body as { id: string };
      expect(deferrer.size).toBe(1);
      await deferrer.flush();
      expect((await rows(owner())).map((row) => row.linkId)).toEqual([saved.id]);
    });

    it('respects a held lease, AI off and the switch off', async () => {
      await seedLink(t.db.prisma, owner(), { title: 'One' });
      await turnOn();
      deferrer.clear();
      const { spy } = spyEmbed();
      await t.db.prisma.aiSettings.update({
        where: { userId: owner() },
        data: { embedLeaseUntil: new Date(Date.now() + 60_000) },
      });
      await run();
      expect(spy).not.toHaveBeenCalled();

      await turnOn(a, { meaningSearch: false });
      const off = await t.db.prisma.aiSettings.findUniqueOrThrow({ where: { userId: owner() } });
      expect(off.embedLeaseUntil).toBeNull();
      await run();
      expect(spy).not.toHaveBeenCalled();
      expect((await settings()).search).toEqual({ state: 'off', ready: 0, total: 0 });
      await a.patch(AI_ENDPOINT.Settings).send({ meaningSearch: 'yes' }).expect(400);
      await a.patch(AI_ENDPOINT.Settings).send({ meaningSearch: null }).expect(400);
    });

    it('stops at the monthly allowance and answers quota below the ready share', async () => {
      for (let i = 0; i < 4; i += 1) await seedLink(t.db.prisma, owner(), { title: `Link ${i}` });
      const limit = AI_QUOTA.free.embedsPerMonth;
      const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
      await t.db.prisma.aiUsage.create({ data: { userId: owner(), month, embeds: limit - 1 } });
      const { spy } = spyEmbed();
      await embedAll();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]?.[0]).toHaveLength(1);
      expect(await rows(owner())).toHaveLength(1);
      expect(await embedsUsed()).toBe(limit);
      expect((await settings()).search).toEqual({ state: 'quota', ready: 1, total: 4 });
    });

    it('refunds and backs off after a provider failure, answering unavailable meanwhile', async () => {
      await seedLink(t.db.prisma, owner(), { title: 'One' });
      await seedLink(t.db.prisma, owner(), { title: 'Two' });
      const { spy } = spyEmbed(() => Promise.resolve({ ok: false, retryable: true }));
      await embedAll();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(await rows(owner())).toEqual([]);
      expect(await embedsUsed()).toBe(0);
      const stored = await t.db.prisma.aiSettings.findUniqueOrThrow({ where: { userId: owner() } });
      expect(stored.embedFailures).toBe(1);
      const wait = (stored.embedNotBefore?.getTime() ?? 0) - Date.now();
      expect(wait).toBeGreaterThan(20_000);
      expect(wait).toBeLessThanOrEqual(30_000);
      expect((await settings()).search).toEqual({ state: 'unavailable', ready: 0, total: 2 });

      await run();
      expect(spy).toHaveBeenCalledTimes(1);

      // A wrong vector count is a failure too; the second failure waits 2 minutes.
      await t.db.prisma.aiSettings.update({
        where: { userId: owner() },
        data: { embedNotBefore: null },
      });
      spy.mockImplementation(() => Promise.resolve({ ok: true, vectors: [], tokens: 0 }));
      await run();
      const again = await t.db.prisma.aiSettings.findUniqueOrThrow({ where: { userId: owner() } });
      expect(again.embedFailures).toBe(2);
      expect((again.embedNotBefore?.getTime() ?? 0) - Date.now()).toBeGreaterThan(100_000);

      // A success clears the failure state.
      spy.mockRestore();
      await t.db.prisma.aiSettings.update({
        where: { userId: owner() },
        data: { embedNotBefore: null },
      });
      await run();
      const cleared = await t.db.prisma.aiSettings.findUniqueOrThrow({
        where: { userId: owner() },
      });
      expect(cleared).toMatchObject({
        embedFailures: 0,
        embedFailedAt: null,
        embedNotBefore: null,
      });
      expect((await settings()).search.state).toBe('ready');
    });

    it('writes nothing for a link trashed during the call and stores an edited one as stale', async () => {
      const gone = await seedLink(t.db.prisma, owner(), { title: 'Gone' });
      const edited = await seedLink(t.db.prisma, owner(), { title: 'Edited' });
      await turnOn();
      deferrer.clear();
      const original = provider().embed.bind(provider());
      let first = true;
      const spy = vi.spyOn(provider(), 'embed').mockImplementation(async (texts, type) => {
        if (first) {
          first = false;
          await t.db.prisma.link.update({ where: { id: gone }, data: { deletedAt: new Date() } });
          await t.db.prisma.link.update({
            where: { id: edited },
            data: { title: 'Edited again' },
          });
        }
        return original(texts, type);
      });
      await run();
      // The edited link was stored stale, so the next chunk of the same pass rebuilt it; the
      // trashed one never got a row.
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[1]?.[0]).toEqual(['Title: Edited again']);
      expect(await rows(owner())).toEqual([
        expect.objectContaining({ linkId: edited, stale: false }),
      ]);
    });

    it('keeps the vector of a trashed link and brings it back on restore without a call', async () => {
      const link = await seedLink(t.db.prisma, owner(), { title: 'Keep me' });
      await seedLink(t.db.prisma, owner(), { title: 'Other' });
      await embedAll();
      const { spy } = spyEmbed();
      await a.delete(`/api/links/${link}`).expect(204);
      expect((await settings()).search).toEqual({ state: 'ready', ready: 1, total: 1 });
      expect(await rows(owner())).toHaveLength(2);
      await a
        .post('/api/trash/restore')
        .send({ items: [{ kind: 'link', id: link }] })
        .expect(200);
      expect((await settings()).search).toEqual({ state: 'ready', ready: 2, total: 2 });
      await run();
      expect(spy).not.toHaveBeenCalled();
    });

    it('answers processing below the ready share and the tick runs the pass', async () => {
      for (let i = 0; i < 70; i += 1) await seedLink(t.db.prisma, owner(), { title: `L${i}` });
      await turnOn();
      deferrer.clear();
      expect((await settings()).search).toEqual({ state: 'processing', ready: 0, total: 70 });
      const tick = (await a.post(AI_ENDPOINT.Tick).expect(200)).body as AiTickResponse;
      expect(tick.search).toEqual({ state: 'processing', ready: 0, total: 70 });
      await deferrer.flush();
      expect((await settings()).search).toEqual({ state: 'ready', ready: 70, total: 70 });
    });

    it('lets the sweep start users whose vectors need work', async () => {
      await seedLink(t.db.prisma, owner(), { title: 'Needs a vector' });
      await turnOn();
      deferrer.clear();
      const res = await request(t.app.getHttpServer())
        .get(AI_ENDPOINT.Sweep)
        .set('Authorization', `Bearer ${SECRET}`)
        .expect(200);
      expect(res.body).toMatchObject({ users: 1 });
      await deferrer.flush();
      expect(await rows(owner())).toHaveLength(1);
    });
  });

  describe('stale hooks', () => {
    const staleOf = async (linkId: string) =>
      (await rows(owner())).find((row) => row.linkId === linkId)?.stale;

    it('marks vectors stale from link edits, bulk tag changes and tag rename, merge and delete', async () => {
      const one = await seedLink(t.db.prisma, owner(), { title: 'One', tags: ['alpha'] });
      const two = await seedLink(t.db.prisma, owner(), { title: 'Two', tags: ['beta'] });
      const three = await seedLink(t.db.prisma, owner(), { title: 'Three', tags: ['gamma'] });
      await embedAll();
      const reset = () => {
        deferrer.clear();
        return t.db.prisma.$executeRaw`UPDATE link_embeddings SET stale = false`;
      };
      const tagId = async (name: string) =>
        (
          await t.db.prisma.tag.findFirstOrThrow({
            where: { userId: owner(), name: { equals: name, mode: 'insensitive' } },
          })
        ).id;

      for (const body of [{ note: 'n' }, { tags: ['x'] }, { summary: 'S' }]) {
        await reset();
        await a.patch(`/api/links/${one}`).send(body).expect(200);
        expect(await staleOf(one)).toBe(true);
        expect(await staleOf(two)).toBe(false);
      }
      await reset();
      await a.patch(`/api/links/${one}`).send({ isFavorite: true }).expect(200);
      expect(await staleOf(one)).toBe(false);

      await reset();
      await a
        .post('/api/links/batch/update')
        .send({ ids: [two], addTags: ['added'] })
        .expect(200);
      expect([await staleOf(one), await staleOf(two)]).toEqual([false, true]);
      expect(deferrer.size).toBe(1);

      await reset();
      await a
        .patch(`/api/tags/${await tagId('gamma')}`)
        .send({ name: 'gamma2' })
        .expect(200);
      expect([await staleOf(two), await staleOf(three)]).toEqual([false, true]);
      // Tag writes kick the pass too (through `TagChangeHooks`), so the vectors rebuild soon.
      expect(deferrer.size).toBe(1);

      await reset();
      await a
        .post(`/api/tags/${await tagId('beta')}/merge`)
        .send({ targetTagId: await tagId('gamma2') })
        .expect(200);
      expect([await staleOf(two), await staleOf(three)]).toEqual([true, false]);
      expect(deferrer.size).toBe(1);

      await reset();
      await a.delete(`/api/tags/${await tagId('gamma2')}`).expect(204);
      expect([await staleOf(two), await staleOf(three)]).toEqual([true, true]);
      expect(await staleOf(one)).toBe(false);
      expect(deferrer.size).toBe(1);
      await deferrer.flush();
      expect(await rows(owner())).toEqual(
        expect.arrayContaining([expect.objectContaining({ linkId: two, stale: false })]),
      );

      // A tag no vector depends on changes nothing and starts no pass.
      await t.db.prisma.tag.create({ data: { userId: owner(), name: 'lonely' } });
      await a
        .patch(`/api/tags/${await tagId('lonely')}`)
        .send({ name: 'lonely2' })
        .expect(200);
      expect(deferrer.size).toBe(0);
    });
  });

  describe('Delete AI data', () => {
    it('deletes the vectors, turns the switch off and keeps the other user’s', async () => {
      await seedLink(t.db.prisma, owner(), { title: 'Mine' });
      await seedLink(t.db.prisma, intruder(), { title: 'Theirs' });
      await turnOn();
      await turnOn(b);
      await deferrer.flush();
      expect(await rows(intruder())).toHaveLength(1);

      await a.delete(AI_ENDPOINT.Data).expect(204);
      expect(await rows(owner())).toEqual([]);
      expect(await rows(intruder())).toHaveLength(1);
      const after = await settings();
      expect(after.settings.meaningSearch).toBe(false);
      expect(after.search.state).toBe('off');
    });
  });

  describe('switched off or deleted during the provider call', () => {
    it('writes no vector when "Delete AI data" runs during the call', async () => {
      await seedLink(t.db.prisma, owner(), { title: 'Mine' });
      await turnOn();
      deferrer.clear();
      const { spy } = spyEmbed(async (texts) => {
        await a.delete(AI_ENDPOINT.Data).expect(204);
        return { ok: true, vectors: texts.map(() => vectorOf(1)), tokens: 1 };
      });
      await run();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(await rows(owner())).toEqual([]);
      expect((await settings()).settings.meaningSearch).toBe(false);
    });

    it('writes no vector when AI or the switch is turned off during the call', async () => {
      await seedLink(t.db.prisma, owner(), { title: 'Mine' });
      await turnOn();
      deferrer.clear();
      for (const off of [{ meaningSearch: false }, { enabled: false }]) {
        const { spy } = spyEmbed(async (texts) => {
          await a.patch(AI_ENDPOINT.Settings).send(off).expect(200);
          return { ok: true, vectors: texts.map(() => vectorOf(1)), tokens: 1 };
        });
        await run();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(await rows(owner())).toEqual([]);
        spy.mockRestore();
        await turnOn(a, { meaningSearch: true });
        deferrer.clear();
      }
    });

    it('does not clear the stale flag of an unchanged text once the switch is off', async () => {
      const link = await seedLink(t.db.prisma, owner(), { title: 'Same' });
      await embedAll();
      await markEmbeddingsStale(t.db.prisma, owner(), { linkIds: [link] });
      const service = t.app.get(AiEmbedService) as unknown as {
        tagNames: (userId: string, ids: readonly string[]) => Promise<Map<string, string[]>>;
      };
      const original = service.tagNames.bind(service);
      vi.spyOn(service, 'tagNames').mockImplementation(async (userId, ids) => {
        await t.db.prisma.aiSettings.update({
          where: { userId: owner() },
          data: { meaningSearch: false },
        });
        return original(userId, ids);
      });
      await run();
      expect(await rows(owner())).toEqual([expect.objectContaining({ linkId: link, stale: true })]);
    });
  });

  describe('races and failures', () => {
    it('stores a first vector as stale when a tag changed during the call (no row to flag yet)', async () => {
      const link = await seedLink(t.db.prisma, owner(), { title: 'Tagged', tags: ['before'] });
      await turnOn();
      deferrer.clear();
      const original = provider().embed.bind(provider());
      let first = true;
      const spy = vi.spyOn(provider(), 'embed').mockImplementation(async (texts, type) => {
        if (first) {
          first = false;
          // A rename with no vector row yet: `markEmbeddingsStale` has nothing to flag and the
          // link's own `updated_at` does not move, so only the snapshot comparison sees it.
          await t.db.prisma.tag.updateMany({
            where: { userId: owner(), name: 'before' },
            data: { name: 'after' },
          });
        }
        return original(texts, type);
      });
      await run();
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[1]?.[0]?.[0]).toContain('after');
      expect(await rows(owner())).toEqual([
        expect.objectContaining({ linkId: link, stale: false }),
      ]);
    });

    it('leaves the lease of a pass that claimed it after ours expired', async () => {
      await seedLink(t.db.prisma, owner(), { title: 'One' });
      await turnOn();
      deferrer.clear();
      const theirs = new Date(Date.now() + 45_000);
      spyEmbed(async (texts) => {
        // Our lease ran out during a slow call and another pass claimed the user.
        await t.db.prisma.aiSettings.update({
          where: { userId: owner() },
          data: { embedLeaseUntil: theirs },
        });
        return { ok: true, vectors: texts.map(() => vectorOf(2)), tokens: 1 };
      });
      await run();
      const stored = await t.db.prisma.aiSettings.findUniqueOrThrow({ where: { userId: owner() } });
      expect(stored.embedLeaseUntil?.getTime()).toBe(theirs.getTime());
    });

    it('refunds and backs off when the provider answers a malformed vector', async () => {
      await seedLink(t.db.prisma, owner(), { title: 'One' });
      const { spy } = spyEmbed((texts) =>
        Promise.resolve({ ok: true, vectors: texts.map(() => [Number.NaN]), tokens: 1 }),
      );
      await embedAll();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(await rows(owner())).toEqual([]);
      expect(await embedsUsed()).toBe(0);
      const stored = await t.db.prisma.aiSettings.findUniqueOrThrow({ where: { userId: owner() } });
      expect(stored.embedFailures).toBe(1);
      expect(stored.embedNotBefore).not.toBeNull();
    });

    it('waits hours after repeated failures that cannot be retried and warns once', async () => {
      await seedLink(t.db.prisma, owner(), { title: 'One' });
      await turnOn();
      deferrer.clear();
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      spyEmbed(() => Promise.resolve({ ok: false, retryable: false }));
      const failAgain = async () => {
        await t.db.prisma.aiSettings.update({
          where: { userId: owner() },
          data: { embedNotBefore: null },
        });
        await run();
        return t.db.prisma.aiSettings.findUniqueOrThrow({ where: { userId: owner() } });
      };
      const waitOf = (stored: { embedNotBefore: Date | null }) =>
        (stored.embedNotBefore?.getTime() ?? 0) - Date.now();
      expect(waitOf(await failAgain())).toBeLessThanOrEqual(30_000);
      expect(waitOf(await failAgain())).toBeLessThanOrEqual(120_000);
      const third = await failAgain();
      expect(third.embedFailures).toBe(AI_EMBED_LIMIT.NonRetryableMax);
      expect(waitOf(third)).toBeGreaterThan(
        AI_EMBED_LIMIT.NonRetryableBackoffSeconds * 1000 - 10_000,
      );
      await failAgain();
      const hoursWarnings = warn.mock.calls.filter(([message]) =>
        String(message).includes('cannot be retried'),
      );
      expect(hoursWarnings).toHaveLength(1);
    });
  });

  describe('data isolation', () => {
    it('never reads, writes or sends another user’s links', async () => {
      await seedLink(t.db.prisma, owner(), { title: 'Owner link', note: 'owner note' });
      const theirs = await seedLink(t.db.prisma, intruder(), {
        title: 'Intruder secret',
        note: 'intruder note',
        tags: ['intruder-tag'],
      });
      await turnOn(b);
      await deferrer.flush();
      const { texts } = spyEmbed();
      await turnOn(a, { includeNotes: true });
      await deferrer.flush();
      expect(texts.join('\n')).not.toMatch(/intruder/i);
      expect(await rows(owner())).toHaveLength(1);

      const before = await rows(intruder());
      expect(await markEmbeddingsStale(t.db.prisma, owner(), { linkIds: [theirs] })).toBe(0);
      const tag = await t.db.prisma.tag.findFirstOrThrow({ where: { userId: intruder() } });
      expect(await markEmbeddingsStale(t.db.prisma, owner(), { tagIds: [tag.id] })).toBe(0);
      expect(await rows(intruder())).toEqual(before);
      expect((await settings(a)).search).toEqual({ state: 'ready', ready: 1, total: 1 });
      expect((await settings(b)).search).toEqual({ state: 'ready', ready: 1, total: 1 });
    });
  });
});
