import { AI_ENDPOINT, type RelatedLinksResponse } from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { AiBackgroundService } from './background/ai-background.service';
import { AI_ENV } from './models/ai-env.const';
import { AiProviderRegistry } from './providers/ai-provider.registry';

const related = (id: string) => AI_ENDPOINT.RelatedLinks.replace(':id', id);

describe('GET /api/links/:id/related (AI-3)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  const deferrer = new AwaitableDeferrer();

  beforeAll(async () => {
    t = await createAuthTestApp({
      env: { [AI_ENV.FullAccessEmails]: undefined },
      overrides: [{ provide: AiBackgroundService, useValue: deferrer }],
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
  const get = async (id: string, agent: TestAgent = a, limit?: number) =>
    (
      await agent
        .get(related(id))
        .query(limit === undefined ? {} : { limit })
        .expect(200)
    ).body as RelatedLinksResponse;
  const titles = (res: RelatedLinksResponse) => res.items.map((item) => item.link.title);
  const turnOn = async (agent: TestAgent = a) => {
    await agent
      .patch(AI_ENDPOINT.Settings)
      .send({ enabled: true, summaries: false, folderMode: 'off', tagsMode: 'off' })
      .expect(200);
    await deferrer.flush();
  };
  const library = async (userId: string) => {
    const folder = await t.db.prisma.folder.create({ data: { userId, name: 'Wardrobe' } });
    const coat = await seedLink(t.db.prisma, userId, {
      title: 'Winter coat buying guide',
      tags: ['clothing', 'winter'],
      folderId: folder.id,
    });
    const parka = await seedLink(t.db.prisma, userId, {
      title: 'Parka and coat review',
      tags: ['clothing'],
    });
    const jacket = await seedLink(t.db.prisma, userId, {
      title: 'Rain jacket guide',
      folderId: folder.id,
    });
    const ramen = await seedLink(t.db.prisma, userId, { title: 'Best ramen in Tokyo' });
    return { coat, parka, jacket, ramen };
  };

  it('lists the closest other live links by the stored vector, with why, and no model call', async () => {
    const { coat, ramen } = await library(owner());
    await turnOn();
    const spy = vi.spyOn(provider(), 'embed');
    const res = await get(coat);
    expect(res.status).toEqual({ state: 'ready', ready: 4, total: 4 });
    expect(titles(res).sort()).toEqual(['Parka and coat review', 'Rain jacket guide']);
    expect(titles(res)).not.toContain('Winter coat buying guide');
    const byTitle = new Map(res.items.map((item) => [item.link.title, item.why]));
    expect(byTitle.get('Parka and coat review')).toEqual([{ source: 'tag', text: 'clothing' }]);
    expect(byTitle.get('Rain jacket guide')).toEqual([{ source: 'folder', text: 'Wardrobe' }]);
    expect(titles(await get(coat, a, 1))).toHaveLength(1);
    expect((await get(ramen)).items).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('leaves out trashed links and answers 404 for a trashed, missing or malformed link', async () => {
    const { coat, parka } = await library(owner());
    await turnOn();
    await a.delete(`/api/links/${parka}`).expect(204);
    expect(titles(await get(coat))).toEqual(['Rain jacket guide']);
    await a.get(related(parka)).expect(404);
    await a.get(related('0193a3a0-0000-7000-8000-000000000999')).expect(404);
    await a.get(related('not-a-uuid')).expect(400);
    await a.get(related(coat)).query({ limit: 11 }).expect(400);
    await anonymous(t.app).get(related(coat)).expect(401);
  });

  it('answers the status without items while off or before the link has a vector', async () => {
    const { coat } = await library(owner());
    expect(await get(coat)).toEqual({ status: { state: 'off', ready: 0, total: 0 }, items: [] });
    await a
      .patch(AI_ENDPOINT.Settings)
      .send({ enabled: true, summaries: false, folderMode: 'off', tagsMode: 'off' })
      .expect(200);
    deferrer.clear();
    expect(await get(coat)).toEqual({
      status: { state: 'processing', ready: 0, total: 4 },
      items: [],
    });
  });

  describe('data isolation', () => {
    it('answers 404 for another user’s link and never lists another user’s links', async () => {
      const mine = await library(owner());
      const theirs = await library(intruder());
      for (let i = 0; i < 25; i += 1) {
        await seedLink(t.db.prisma, intruder(), {
          title: `Winter coat buying guide ${i}`,
          tags: ['clothing', 'winter'],
        });
      }
      await turnOn();
      await turnOn(b);
      await a.get(related(theirs.coat)).expect(404);
      await b.get(related(mine.coat)).expect(404);
      const ownIds = new Set(Object.values(mine));
      const res = await get(mine.coat, a, 10);
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items.every((item) => ownIds.has(item.link.id))).toBe(true);
    });
  });
});
