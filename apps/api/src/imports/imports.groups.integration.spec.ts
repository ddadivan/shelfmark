import { randomUUID } from 'node:crypto';
import {
  AI_ENDPOINT,
  AI_QUOTA,
  IMPORT_ENDPOINT,
  IMPORT_ERROR_MESSAGE,
  IMPORT_LIMIT,
  type ImportGroupLink,
  type ImportGroupsResponse,
} from '@shelfmark/contracts';
import { usageMonth } from '../ai/usage/usage-month';
import { AI_ENV } from '../ai/models/ai-env.const';
import { MockEmbeddingProvider } from '../ai/providers/mock-embedding.provider';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { signInDemo } from '../../test-utils/sign-in-demo';

const GROUPS = IMPORT_ENDPOINT.Groups;

const link = (title: string, host: string, path = ''): ImportGroupLink => ({
  title,
  url: `https://${host}/${path}`,
});

const WORDS = [
  'alpha',
  'bravo',
  'charlie',
  'delta',
  'echo',
  'foxtrot',
  'golf',
  'hotel',
  'india',
  'juliet',
  'kilo',
  'mike',
];

/** Three topics of twelve links each (k = round(sqrt(36 / 4)) = 3), interleaved like a bookmarks bar. */
const FILE: ImportGroupLink[] = WORDS.flatMap((word) => [
  link(`Ramen ${word}`, 'noodles.example', `ramen/${word}`),
  link(`Angular ${word}`, 'angular.example', `angular/${word}`),
  link(`Lisbon ${word}`, 'trips.example', `lisbon/${word}`),
]);

describe('POST /api/imports/groups (#387, ADR 0056 decision 10)', () => {
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
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const ready2 = async (): Promise<void> => {
    await turnOn(b);
    await aiPack(users.intruder.userId);
  };
  const turnOn = (agent: TestAgent = a) =>
    agent.patch(AI_ENDPOINT.Settings).send({ enabled: true, meaningSearch: false }).expect(200);
  const aiPack = (userId = users.owner.userId) =>
    t.db.prisma.user.update({ where: { id: userId }, data: { aiPack: true } });
  const ready = async (agent: TestAgent = a, userId = users.owner.userId): Promise<void> => {
    await turnOn(agent);
    await aiPack(userId);
  };
  const settingsRow = (userId = users.owner.userId) =>
    t.db.prisma.aiSettings.findUniqueOrThrow({ where: { userId } });
  const usageRow = async () => {
    const rows = await t.db.prisma.aiUsage.findMany({ where: { userId: users.owner.userId } });
    return rows[0];
  };
  const group = async (
    links: ImportGroupLink[] = FILE,
    folderNames: string[] = [],
    agent: TestAgent = a,
  ): Promise<ImportGroupsResponse> =>
    (await agent.post(GROUPS).send({ links, folderNames }).expect(200))
      .body as ImportGroupsResponse;

  describe('validation and access', () => {
    it('needs a session', async () => {
      await anonymous(t.app).post(GROUPS).send({ links: FILE, folderNames: [] }).expect(401);
    });

    it('refuses bodies that do not match the contract', async () => {
      await ready();
      const ok = link('A', 'a.example');
      const bad = async (body: object) => {
        resetRateLimits(t.app);
        return a.post(GROUPS).send(body).expect(400);
      };
      await bad({ links: [], folderNames: [] });
      await bad({ links: [ok] });
      await bad({ links: 'x', folderNames: [] });
      await bad({ links: [{ title: 'A', url: 'ftp://a.example/x' }], folderNames: [] });
      await bad({ links: [{ title: 'A', url: 'javascript:alert(1)' }], folderNames: [] });
      await bad({
        links: [{ title: 'x'.repeat(IMPORT_LIMIT.GroupTitleMax + 1), url: 'https://a.example' }],
        folderNames: [],
      });
      await bad({
        links: [{ title: 'A', url: `https://a.example/${'x'.repeat(IMPORT_LIMIT.GroupUrlMax)}` }],
        folderNames: [],
      });
      await bad({ links: [{ title: 'A', url: 'https://a.example', extra: 1 }], folderNames: [] });
      await bad({
        links: Array.from({ length: IMPORT_LIMIT.GroupLinksMax + 1 }, () => ok),
        folderNames: [],
      });
      await bad({
        links: [ok],
        folderNames: Array.from({ length: IMPORT_LIMIT.GroupFolderNamesMax + 1 }, () => 'F'),
      });
      await bad({ links: [ok], folderNames: ['x'.repeat(101)] });
      await bad({ links: [ok], folderNames: ['a\u0000b'] });
      expect((await settingsRow()).backfillUsed).toBe(0);
    });
  });

  describe('allowance', () => {
    it('is 409 AiUnavailable while AI is off, with nothing taken', async () => {
      await aiPack();
      const res = await a.post(GROUPS).send({ links: FILE, folderNames: [] }).expect(409);
      expect(res.body.message).toBe(IMPORT_ERROR_MESSAGE.AiUnavailable);
      expect(await t.db.prisma.aiSettings.count()).toBe(0);
    });

    it('is 409 AiUnavailable on a plan without the allowance for existing links', async () => {
      await turnOn();
      const res = await a.post(GROUPS).send({ links: FILE, folderNames: [] }).expect(409);
      expect(res.body.message).toBe(IMPORT_ERROR_MESSAGE.AiUnavailable);
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0, importAiPrepaid: 0 });
    });

    it('takes all of the units or none: a short allowance is 409 AiAllowance and keeps the old ones', async () => {
      await ready();
      await group(FILE.slice(0, 6));
      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { backfillUsed: 4_995 },
      });
      // The 6 earlier units come back first (4,989 used, 11 left): 12 still do not fit.
      const short = await a
        .post(GROUPS)
        .send({ links: FILE.slice(0, 12), folderNames: [] })
        .expect(409);
      expect(short.body.message).toBe(IMPORT_ERROR_MESSAGE.AiAllowance);
      expect(await settingsRow()).toMatchObject({ backfillUsed: 4_995, importAiPrepaid: 6 });
      // 11 fit exactly: the earlier 6 are given back, 11 taken.
      await group(FILE.slice(0, 11));
      expect(await settingsRow()).toMatchObject({ backfillUsed: 4_989 + 11, importAiPrepaid: 11 });
    });

    it('charges one unit per link and counts them against the monthly cap, not the other counters', async () => {
      await ready();
      const res = await group();
      expect(res.charged).toBe(FILE.length);
      expect(await settingsRow()).toMatchObject({
        backfillUsed: FILE.length,
        importAiPrepaid: FILE.length,
      });
      expect(await usageRow()).toMatchObject({
        importGroupLinks: FILE.length,
        links: 0,
        embeds: 0,
      });
    });

    it('gives the units of an earlier grouping back: grouping again costs no extra allowance, but the monthly count stays', async () => {
      await ready();
      await group(FILE);
      await group(FILE.slice(0, 6));
      expect(await settingsRow()).toMatchObject({ backfillUsed: 6, importAiPrepaid: 6 });
      expect((await usageRow())?.importGroupLinks).toBe(FILE.length + 6);
    });

    it('is 409 GroupsMonthly when the links do not fit the month, checked before the allowance, nothing taken', async () => {
      await ready();
      const cap = AI_QUOTA['ai-pack'].importGroupLinksPerMonth;
      await group(FILE.slice(0, 6));
      await t.db.prisma.aiUsage.update({
        where: {
          userId_month: { userId: users.owner.userId, month: new Date(usageMonth(new Date())) },
        },
        data: { importGroupLinks: cap - 10 },
      });
      // The allowance is short too, yet the monthly cap answers first.
      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { backfillUsed: 4_999 },
      });
      const res = await a
        .post(GROUPS)
        .send({ links: FILE.slice(0, 11), folderNames: [] })
        .expect(409);
      expect(res.body.message).toBe(IMPORT_ERROR_MESSAGE.GroupsMonthly);
      expect((await usageRow())?.importGroupLinks).toBe(cap - 10);
      // The earlier units stay (the whole reservation rolled back).
      expect(await settingsRow()).toMatchObject({ backfillUsed: 4_999, importAiPrepaid: 6 });
      // Exactly what is left fits (the allowance has room again).
      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { backfillUsed: 4_990 },
      });
      await group(FILE.slice(0, 10));
      expect((await usageRow())?.importGroupLinks).toBe(cap);
    });

    it('is 409 GroupsMonthly for a file above the whole cap on a first grouping', async () => {
      await ready();
      // 2,000 links fit the cap; the INSERT path must not skip it when the cap is lower than the file.
      await t.db.prisma.aiUsage.create({
        data: {
          userId: users.owner.userId,
          month: new Date(usageMonth(new Date())),
          importGroupLinks: AI_QUOTA['ai-pack'].importGroupLinksPerMonth,
        },
      });
      const res = await a.post(GROUPS).send({ links: FILE, folderNames: [] }).expect(409);
      expect(res.body.message).toBe(IMPORT_ERROR_MESSAGE.GroupsMonthly);
    });

    it('gives the monthly count back with the units on a provider failure', async () => {
      await ready();
      await group(FILE.slice(0, 4));
      vi.spyOn(MockEmbeddingProvider.prototype, 'embed').mockResolvedValue({
        ok: false,
        retryable: true,
      });
      await a.post(GROUPS).send({ links: FILE, folderNames: [] }).expect(503);
      expect((await usageRow())?.importGroupLinks).toBe(4);
    });

    it('keeps the units of a newer grouping when an older one fails late', async () => {
      await ready();
      const original = MockEmbeddingProvider.prototype.embed;
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let entered: () => void = () => undefined;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      vi.spyOn(MockEmbeddingProvider.prototype, 'embed').mockImplementationOnce(async () => {
        entered();
        await gate;
        return { ok: false, retryable: true };
      });
      vi.spyOn(MockEmbeddingProvider.prototype, 'embed').mockImplementation(function (
        this: MockEmbeddingProvider,
        ...args: Parameters<typeof original>
      ) {
        return original.apply(this, args);
      });
      const first = a
        .post(GROUPS)
        .send({ links: FILE, folderNames: [] })
        .then((res) => res.status);
      await started;
      expect(await settingsRow()).toMatchObject({ importAiPrepaid: FILE.length });
      // The second grouping reserves while the first is still in flight and succeeds.
      const second = await group(FILE.slice(0, 12));
      expect(second.charged).toBe(12);
      release();
      expect(await first).toBe(503);
      // The first one's late release found another token: the second keeps its units.
      expect(await settingsRow()).toMatchObject({ backfillUsed: 12, importAiPrepaid: 12 });
      expect((await settingsRow()).importAiGroupingId).not.toBeNull();
    });

    it('gives the units back and answers 503 when the naming call fails', async () => {
      await ready();
      await group(FILE.slice(0, 4));
      // The marker sits in the titles of one topic, so the model is shown it.
      const links = FILE.map((entry, i) =>
        i % 3 === 0 ? { ...entry, title: `${entry.title} ai-fail` } : entry,
      );
      const res = await a.post(GROUPS).send({ links, folderNames: [] }).expect(503);
      expect(res.body).toMatchObject({ statusCode: 503 });
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0, importAiPrepaid: 0 });
    });

    it('gives the units back and answers 503 when the embedding call fails', async () => {
      await ready();
      vi.spyOn(MockEmbeddingProvider.prototype, 'embed').mockResolvedValue({
        ok: false,
        retryable: true,
      });
      await a.post(GROUPS).send({ links: FILE, folderNames: [] }).expect(503);
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0, importAiPrepaid: 0 });
    });

    it('treats a refusal of the model like a failure', async () => {
      await ready();
      await a
        .post(GROUPS)
        .send({
          links: FILE.map((entry, i) =>
            i % 3 === 0 ? { ...entry, title: `${entry.title} ai-refuse` } : entry,
          ),
          folderNames: [],
        })
        .expect(503);
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0, importAiPrepaid: 0 });
    });
  });

  describe('grouping', () => {
    it('groups the file by topic, largest first, every link in at most one place', async () => {
      await ready();
      const res = await group();
      expect(res.groups.map((entry) => entry.name)).toEqual(['Ramen', 'Angular', 'Lisbon']);
      expect(res.groups.map((entry) => entry.key)).toEqual(['g1', 'g2', 'g3']);
      for (const entry of res.groups) {
        expect(entry.folderId).toBeNull();
        expect(entry.linkIndexes).toHaveLength(12);
      }
      const all = [...res.groups.flatMap((entry) => entry.linkIndexes), ...res.rest];
      expect([...all].sort((x, y) => x - y)).toEqual(FILE.map((_, i) => i));
      // Topics: indexes 0, 3, 6… are ramen; 1, 4, 7… angular; 2, 5, 8… lisbon.
      const byName = new Map(res.groups.map((entry) => [entry.name, entry.linkIndexes]));
      const every3 = (from: number) => Array.from({ length: 12 }, (_, i) => from + 3 * i);
      expect(byName.get('Ramen')).toEqual(every3(0));
      expect(byName.get('Angular')).toEqual(every3(1));
      expect(byName.get('Lisbon')).toEqual(every3(2));
    });

    it('is stable: the same file gives the same groups', async () => {
      await ready();
      const first = await group();
      const second = await group();
      expect(second).toEqual(first);
    });

    it('puts links that fit no topic into rest and answers no group for a tiny file', async () => {
      await ready();
      const res = await group([link('Alone', 'solo.example'), link('Other', 'two.example')]);
      expect(res.groups).toEqual([]);
      expect(res.rest).toEqual([0, 1]);
      expect(res.charged).toBe(2);
    });

    it('matches a group to an own live folder by name, ignoring case and accents', async () => {
      await ready();
      const ramen = await t.db.prisma.folder.create({
        data: { userId: users.owner.userId, name: 'RAMEN', position: 0 },
      });
      const gone = await t.db.prisma.folder.create({
        data: { userId: users.owner.userId, name: 'Lisbon', position: 1, deletedAt: new Date() },
      });
      const res = await group();
      const folderOf = (name: string) => res.groups.find((entry) => entry.name === name)?.folderId;
      expect(folderOf('Ramen')).toBe(ramen.id);
      // A folder in Trash is not "already there".
      expect(folderOf('Lisbon')).toBeNull();
      expect(folderOf('Lisbon')).not.toBe(gone.id);
    });

    it("never matches another user's folders", async () => {
      await ready();
      await t.db.prisma.folder.create({
        data: { userId: users.intruder.userId, name: 'Ramen', position: 0 },
      });
      const res = await group();
      expect(res.groups.every((entry) => entry.folderId === null)).toBe(true);
    });

    it('does not touch the data of another user', async () => {
      await ready();
      await ready(b, users.intruder.userId);
      await group();
      expect(await settingsRow(users.intruder.userId)).toMatchObject({
        backfillUsed: 0,
        importAiPrepaid: 0,
      });
    });

    it('works for a demo sandbox only when AI is available to it (never the allowance)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const res = await asUser(t.app, demo)
        .post(GROUPS)
        .send({ links: FILE, folderNames: [] })
        .expect(409);
      expect(res.body.message).toBe(IMPORT_ERROR_MESSAGE.AiUnavailable);
    });
  });

  describe('DELETE /api/imports/groups', () => {
    it('needs a session', async () => {
      await anonymous(t.app).delete(GROUPS).expect(401);
    });

    it('gives the pending units back, keeps the monthly count and is idempotent', async () => {
      await ready();
      await group(FILE.slice(0, 6));
      await a.delete(GROUPS).expect(204);
      expect(await settingsRow()).toMatchObject({
        backfillUsed: 0,
        importAiPrepaid: 0,
        importAiGroupingId: null,
        importAiPrepaidAt: null,
      });
      expect((await usageRow())?.importGroupLinks).toBe(6);
      await a.delete(GROUPS).expect(204);
      expect((await settingsRow()).backfillUsed).toBe(0);
    });

    it('answers 204 without a settings row and never touches another user', async () => {
      await ready();
      await ready2();
      await group(FILE.slice(0, 6));
      await b.delete(GROUPS).expect(204);
      expect(await settingsRow()).toMatchObject({ backfillUsed: 6, importAiPrepaid: 6 });
    });

    it('does not take back units an import already took', async () => {
      await ready();
      await group(FILE.slice(0, 6));
      await a
        .post(IMPORT_ENDPOINT.Base)
        .send({ source: 'browser', fileName: 'b.html', folders: [], aiPass: true })
        .expect(201);
      await a.delete(GROUPS).expect(204);
      expect((await settingsRow()).backfillUsed).toBe(6);
    });
  });

  describe('body limit', () => {
    const big = (links: number): ImportGroupLink[] =>
      Array.from({ length: links }, (_, i) => ({
        title: `${'t'.repeat(120)} ${i}`,
        url: `https://big.example/${'p'.repeat(100)}/${i}`,
      }));

    it('takes a 150 kb body here but still refuses it elsewhere', async () => {
      await ready();
      const links = big(700);
      const body = JSON.stringify({ links, folderNames: [] });
      expect(body.length).toBeGreaterThan(150_000);
      expect(body.length).toBeLessThan(IMPORT_LIMIT.GroupBodyBytesMax);
      const res = await a
        .post(GROUPS)
        .send(body)
        .set('Content-Type', 'application/json')
        .expect(200);
      expect((res.body as ImportGroupsResponse).charged).toBe(700);
      const urls = Array.from(
        { length: 500 },
        (_, i) => `https://e.example/${'x'.repeat(280)}/${i}`,
      );
      const check = JSON.stringify({ urls });
      expect(check.length).toBeGreaterThan(150_000);
      await a
        .post(IMPORT_ENDPOINT.Check)
        .send(check)
        .set('Content-Type', 'application/json')
        .expect(413);
    });

    it('takes a start body past 100 kb (a full folder tree) and a 150 kb one reaches validation, not a 413', async () => {
      // The longest valid tree (500 folders, 64-character keys, 100-character names) is ~136 kb.
      const tree = (count: number) =>
        Array.from({ length: count }, (_, i) => ({
          key: `${i}`.padStart(64, 'k'),
          parentKey: i === 0 ? null : '0'.padStart(64, 'k'),
          name: `${i}`.padStart(100, 'n'),
        }));
      const full = JSON.stringify({ source: 'browser', fileName: 'b.html', folders: tree(500) });
      expect(full.length).toBeGreaterThan(100 * 1024);
      await a
        .post(IMPORT_ENDPOINT.Base)
        .send(full)
        .set('Content-Type', 'application/json')
        .expect(201);
      resetRateLimits(t.app);
      const over = JSON.stringify({ source: 'browser', fileName: 'b.html', folders: tree(600) });
      expect(over.length).toBeGreaterThan(150_000);
      const res = await a
        .post(IMPORT_ENDPOINT.Base)
        .send(over)
        .set('Content-Type', 'application/json')
        .expect(400);
      expect(res.body.statusCode).toBe(400);
      // Other import routes keep the global 100 kb limit.
      const filler = JSON.stringify({ skipped: 0, failed: 0, pad: 'x'.repeat(150_000) });
      await a
        .post(`${IMPORT_ENDPOINT.Base}/${randomUUID()}/finish`)
        .send(filler)
        .set('Content-Type', 'application/json')
        .expect(413);
    });

    it('needs a session cookie before a start body is read', async () => {
      await anonymous(t.app)
        .post(IMPORT_ENDPOINT.Base)
        .send(JSON.stringify({ source: 'browser', fileName: 'b.html', folders: [] }))
        .set('Content-Type', 'application/json')
        .expect(401);
    });

    it('refuses more than the route limit with 413 before reading it', async () => {
      await ready();
      const filler = JSON.stringify({
        links: [],
        folderNames: ['x'.repeat(IMPORT_LIMIT.GroupBodyBytesMax)],
      });
      await a.post(GROUPS).send(filler).set('Content-Type', 'application/json').expect(413);
    });

    it('needs a session cookie before it reads a large body', async () => {
      const body = JSON.stringify({ links: big(10), folderNames: [] });
      await anonymous(t.app)
        .post(GROUPS)
        .send(body)
        .set('Content-Type', 'application/json')
        .expect(401);
    });

    it('is rate limited per client before the body is parsed', async () => {
      await ready();
      const body = { links: FILE.slice(0, 3), folderNames: [] };
      let last = 0;
      for (let i = 0; i < 12; i += 1) {
        last = (await a.post(GROUPS).send(body)).status;
      }
      expect(last).toBe(429);
    });
  });
});
