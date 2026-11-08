import {
  LINK_LIMIT,
  LINK_SORT_FIELD,
  PAGE_LIMIT,
  SORT_ORDER,
  type LinkResponse,
  type LinkSortField,
  type ListLinksResponse,
  type RecentLinksResponse,
  type SortOrder,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { seedLink } from '../../test-utils/seed-link';

const BASE = '/api/links';

async function list(agent: TestAgent, query = ''): Promise<ListLinksResponse> {
  return (await agent.get(`${BASE}${query}`).expect(200)).body as ListLinksResponse;
}

const titles = (page: ListLinksResponse): string[] => page.items.map((item) => item.title);

describe('links API: reads', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const seed = (options: Parameters<typeof seedLink>[2] = {}, user = users.owner) =>
    seedLink(t.db.prisma, user.userId, options);

  const createFolder = async (name: string, parentId?: string) =>
    (
      await t.db.prisma.folder.create({
        data: { userId: users.owner.userId, name, parentId: parentId ?? null },
      })
    ).id;

  it('lists only own links, newest first by default, with tags and null images', async () => {
    await seed({ title: 'old', createdAt: new Date('2026-01-01T00:00:00Z') });
    await seed({
      title: 'new',
      createdAt: new Date('2026-02-01T00:00:00Z'),
      tags: ['b-tag', 'A-tag'],
      note: 'why',
    });
    await seed({ title: 'foreign' }, users.intruder);

    const page = await list(a);
    expect(titles(page)).toEqual(['new', 'old']);
    expect(page.nextCursor).toBeNull();
    expect(page.items[0]).toMatchObject({
      note: 'why',
      tags: ['A-tag', 'b-tag'],
      faviconUrl: null,
      imageUrl: null,
      isFavorite: false,
      lastOpenedAt: null,
    });
    expect(titles(await list(b))).toEqual(['foreign']);
  });

  it('filters by folder (direct children only), unsorted and favorite', async () => {
    const parent = await createFolder('Parent');
    const child = await createFolder('Child', parent);
    await seed({ title: 'in-parent', folderId: parent });
    await seed({ title: 'in-child', folderId: child, isFavorite: true });
    await seed({ title: 'loose' });

    expect(titles(await list(a, `?folderId=${parent}`))).toEqual(['in-parent']);
    expect(titles(await list(a, `?folderId=${child}`))).toEqual(['in-child']);
    expect(titles(await list(a, '?unsorted=true'))).toEqual(['loose']);
    expect(titles(await list(a, '?favorite=true'))).toEqual(['in-child']);
    expect((await list(a, '?favorite=false')).items).toHaveLength(2);
    await a.get(`${BASE}?folderId=${parent}&unsorted=true`).expect(400);
    await a.get(`${BASE}?folderId=nope`).expect(400);
    await a.get(`${BASE}?unsorted=maybe`).expect(400);
  });

  it('requires every tag, case-insensitively', async () => {
    await seed({ title: 'both', tags: ['ts', 'angular'] });
    await seed({ title: 'one', tags: ['ts'] });
    await seed({ title: 'none' });

    expect(titles(await list(a, '?tag=ts'))).toHaveLength(2);
    expect(titles(await list(a, '?tag=TS&tag=Angular'))).toEqual(['both']);
    expect(titles(await list(a, '?tag=ts&tag=ts'))).toHaveLength(2);
    expect(titles(await list(a, '?tag=missing'))).toEqual([]);
    const tooMany = Array.from({ length: LINK_LIMIT.TagFilterMax + 1 }, (_, i) => `tag=t${i}`);
    await a.get(`${BASE}?${tooMany.join('&')}`).expect(400);
    await a.get(`${BASE}?tag=${'x'.repeat(51)}`).expect(400);
  });

  it('never matches another user tag of the same name', async () => {
    await seed({ title: 'mine', tags: ['shared'] });
    await seed({ title: 'theirs', tags: ['shared'] }, users.intruder);
    expect(titles(await list(a, '?tag=shared'))).toEqual(['mine']);
    expect(titles(await list(b, '?tag=shared'))).toEqual(['theirs']);
  });

  describe('search', () => {
    it('matches title, note and URL, case-insensitively, every word', async () => {
      await seed({ title: 'Angular Signals guide', url: 'https://a.test/1' });
      await seed({ title: 'Cooking', note: 'signals of hunger', url: 'https://b.test/2' });
      await seed({ title: 'Other', url: 'https://example.test/signals/3' });
      await seed({ title: 'Unrelated', url: 'https://c.test/4' });

      expect(await titlesOf('?q=SIGNALS')).toEqual(
        ['Angular Signals guide', 'Cooking', 'Other'].sort(),
      );
      expect(await titlesOf('?q=signals guide')).toEqual(['Angular Signals guide']);
      expect(await titlesOf('?q=signals hunger')).toEqual(['Cooking']);
      expect(await titlesOf('?q=%20%20')).toHaveLength(4);
    });

    async function titlesOf(query: string): Promise<string[]> {
      return titles(await list(a, query)).sort();
    }

    it('treats % _ and backslash as plain characters', async () => {
      await seed({ title: '100% sure' });
      await seed({ title: '1000 sure' });
      await seed({ title: 'a_b' });
      await seed({ title: 'axb' });
      await seed({ title: 'c:\\dir' });
      await seed({ title: 'c:xdir' });

      expect(await titlesOf('?q=100%25')).toEqual(['100% sure']);
      expect(await titlesOf('?q=a_b')).toEqual(['a_b']);
      expect(await titlesOf('?q=%25')).toEqual(['100% sure']);
      expect(await titlesOf('?q=_')).toEqual(['a_b']);
      expect(await titlesOf('?q=c:%5Cdir')).toEqual(['c:\\dir']);
    });

    it('uses at most five words and rejects an over-long query', async () => {
      await seed({ title: 'one two three four five' });
      // The sixth word cannot match, but only the first five are used.
      expect(await titlesOf('?q=one two three four five nomatch')).toEqual([
        'one two three four five',
      ]);
      await a.get(`${BASE}?q=${'x'.repeat(LINK_LIMIT.QueryMax + 1)}`).expect(400);
    });

    it('keeps the user filter when the text would match foreign links', async () => {
      await seed({ title: 'secret plan' }, users.intruder);
      expect(await titlesOf('?q=secret')).toEqual([]);
    });
  });

  describe('paging', () => {
    const SORTS: LinkSortField[] = Object.values(LINK_SORT_FIELD);
    const ORDERS: SortOrder[] = Object.values(SORT_ORDER);

    it.each(SORTS.flatMap((sort) => ORDERS.map((order) => [sort, order] as const)))(
      'walks every row exactly once in order (%s %s), ties included',
      async (sort, order) => {
        const same = new Date('2026-03-01T00:00:00Z');
        // Equal timestamps and equal titles force the id tie-breaker.
        for (let i = 0; i < 7; i++) await seed({ title: 'Tie', createdAt: same });
        for (let i = 0; i < 5; i++) {
          await seed({ title: `T${i % 3}`, createdAt: new Date(same.getTime() + i * 1000) });
        }
        await seed({ title: 'Ünï', createdAt: new Date(same.getTime() - 1000) });

        const all: LinkResponse[] = [];
        let cursor: string | null = null;
        let pages = 0;
        do {
          const cursorPart: string = cursor === null ? '' : `&cursor=${cursor}`;
          const page = await list(a, `?sort=${sort}&order=${order}&limit=4${cursorPart}`);
          expect(page.items.length).toBeLessThanOrEqual(4);
          all.push(...page.items);
          cursor = page.nextCursor;
          pages += 1;
        } while (cursor !== null && pages < 10);

        expect(all).toHaveLength(13);
        expect(new Set(all.map((item) => item.id)).size).toBe(13);
        const reference = await list(a, `?sort=${sort}&order=${order}&limit=${PAGE_LIMIT.Max}`);
        expect(all.map((item) => item.id)).toEqual(reference.items.map((item) => item.id));
        if (sort === LINK_SORT_FIELD.CreatedAt) {
          const times = all.map((item) => item.createdAt);
          const sorted = [...times].sort();
          expect(times).toEqual(order === SORT_ORDER.Asc ? sorted : sorted.reverse());
        }
      },
    );

    it('has no next cursor when the last page is exactly full', async () => {
      await seed();
      await seed();
      const page = await list(a, '?limit=2');
      expect(page.items).toHaveLength(2);
      expect(page.nextCursor).toBeNull();
      expect((await list(a, '?limit=1')).nextCursor).not.toBeNull();
    });

    it('sorts by title case-insensitively', async () => {
      await seed({ title: 'banana' });
      await seed({ title: 'Apple' });
      await seed({ title: 'cherry' });
      expect(titles(await list(a, '?sort=title&order=asc'))).toEqual(['Apple', 'banana', 'cherry']);
    });

    it('rejects bad limits and cursors', async () => {
      await seed();
      await seed();
      await a.get(`${BASE}?limit=0`).expect(400);
      await a.get(`${BASE}?limit=${PAGE_LIMIT.Max + 1}`).expect(400);
      await a.get(`${BASE}?limit=1.5`).expect(400);
      await a.get(`${BASE}?cursor=garbage`).expect(400);
      await a.get(`${BASE}?cursor=${'a'.repeat(PAGE_LIMIT.CursorMax + 1)}`).expect(400);
      await a.get(`${BASE}?sort=url`).expect(400);
      await a.get(`${BASE}?order=sideways`).expect(400);
      await a.get(`${BASE}?bogus=1`).expect(400);

      const first = await list(a, '?limit=1');
      const cursor = first.nextCursor ?? '';
      await a.get(`${BASE}?limit=1&cursor=${cursor}&order=asc`).expect(400);
      await a.get(`${BASE}?limit=1&cursor=${cursor}&sort=title`).expect(400);
      await a.get(`${BASE}?limit=1&cursor=${cursor}`).expect(200);
    });

    it('cannot use a foreign cursor to read foreign rows', async () => {
      await seed({ title: 'a1' });
      await seed({ title: 'a2' });
      await seed({ title: 'b1' }, users.intruder);
      await seed({ title: 'b2' }, users.intruder);
      const foreign = (await list(b, '?limit=1')).nextCursor ?? '';
      const page = await list(a, `?limit=10&cursor=${foreign}`);
      expect(titles(page).every((title) => title.startsWith('a'))).toBe(true);
    });
  });

  describe('recent', () => {
    it('returns opened links by last open, newest first, limited', async () => {
      await seed({ title: 'never' });
      await seed({ title: 'first', lastOpenedAt: new Date('2026-01-01T00:00:00Z') });
      await seed({ title: 'second', lastOpenedAt: new Date('2026-01-02T00:00:00Z') });
      await seed(
        { title: 'foreign', lastOpenedAt: new Date('2026-01-03T00:00:00Z') },
        users.intruder,
      );

      const all = (await a.get(`${BASE}/recent`).expect(200)).body as RecentLinksResponse;
      expect(all.items.map((item) => item.title)).toEqual(['second', 'first']);
      const one = (await a.get(`${BASE}/recent?limit=1`).expect(200)).body as RecentLinksResponse;
      expect(one.items.map((item) => item.title)).toEqual(['second']);
      await a.get(`${BASE}/recent?limit=0`).expect(400);
      await a.get(`${BASE}/recent?limit=${PAGE_LIMIT.Max + 1}`).expect(400);
    });
  });

  describe('get', () => {
    it('reads an own link and answers 404 for foreign and unknown ids', async () => {
      const id = await seed({ title: 'mine', tags: ['t'] });
      const found = (await a.get(`${BASE}/${id}`).expect(200)).body as LinkResponse;
      expect(found).toMatchObject({ id, title: 'mine', tags: ['t'] });
      await b.get(`${BASE}/${id}`).expect(404);
      await a.get(`${BASE}/018f0000-0000-7000-8000-00000000dead`).expect(404);
      await a.get(`${BASE}/not-a-uuid`).expect(400);
    });
  });
});
