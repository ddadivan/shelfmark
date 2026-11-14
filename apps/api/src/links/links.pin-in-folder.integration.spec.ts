import {
  LINK_LIMIT,
  type FolderResponse,
  type LinkResponse,
  type ListLinksResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';

const LINKS = '/api/links';

describe('pin a link to the top of its folder', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  let folderId: string;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
    folderId = (
      (await a.post('/api/folders').send({ name: 'Work' }).expect(201)).body as FolderResponse
    ).id;
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const seed = (title: string, folder: string | null = folderId): Promise<string> =>
    seedLink(t.db.prisma, users.owner.userId, { title, folderId: folder ?? undefined });
  const pin = (id: string, value = true) =>
    a.patch(`${LINKS}/${id}`).send({ pinnedInFolder: value });
  const list = async (query: Record<string, string | number> = {}): Promise<ListLinksResponse> =>
    (
      await a
        .get(LINKS)
        .query({ folderId, ...query })
        .expect(200)
    ).body as ListLinksResponse;
  const titles = (items: LinkResponse[]): string[] => items.map((l) => l.title);

  it('pins in the order of pinning, and answers the link with the time', async () => {
    const x = await seed('x');
    const y = await seed('y');
    const z = await seed('z');
    const res = await pin(z).expect(200);
    expect((res.body as LinkResponse).pinnedInFolderAt).toEqual(expect.any(String));
    await pin(x).expect(200);
    const page = await list({ sort: 'title', order: 'asc' });
    expect(titles(page.pinned)).toEqual(['z', 'x']);
    expect(titles(page.items)).toEqual(['y']);
    expect(page.items.every((l) => l.pinnedInFolderAt === null)).toBe(true);
    // Whatever the sort and order the pinned list is the same.
    expect(titles((await list({ sort: 'createdAt', order: 'desc' })).pinned)).toEqual(['z', 'x']);
    void y;
  });

  it('keeps the keyset cursor correct: pinned only on page one, never repeated, nothing lost', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 7; i++) ids.push(await seed(`link-${i}`));
    await pin(ids[1] as string).expect(200);
    await pin(ids[5] as string).expect(200);
    const seen: string[] = [];
    const first = await list({ sort: 'title', order: 'asc', limit: 2 });
    expect(titles(first.pinned)).toEqual(['link-1', 'link-5']);
    let page = first;
    for (;;) {
      seen.push(...titles(page.items));
      if (page.nextCursor === null) break;
      page = await list({ sort: 'title', order: 'asc', limit: 2, cursor: page.nextCursor });
      expect(page.pinned).toEqual([]);
    }
    expect(seen).toEqual(['link-0', 'link-2', 'link-3', 'link-4', 'link-6']);
  });

  it('pinned links obey the same filters; without a folder nothing is split off', async () => {
    const x = await seed('alpha one');
    await seed('beta two');
    await pin(x).expect(200);
    expect(titles((await list({ q: 'beta' })).pinned)).toEqual([]);
    expect(titles((await list({ q: 'alpha' })).pinned)).toEqual(['alpha one']);
    const all = (await a.get(LINKS).expect(200)).body as ListLinksResponse;
    expect(all.pinned).toEqual([]);
    expect(titles(all.items).sort()).toEqual(['alpha one', 'beta two']);
    const unsorted = (await a.get(LINKS).query({ unsorted: true }).expect(200))
      .body as ListLinksResponse;
    expect(unsorted.pinned).toEqual([]);
  });

  it('unpins, and pinning twice keeps the first pin time', async () => {
    const x = await seed('x');
    const first = ((await pin(x).expect(200)).body as LinkResponse).pinnedInFolderAt;
    expect(((await pin(x).expect(200)).body as LinkResponse).pinnedInFolderAt).toBe(first);
    expect(((await pin(x, false).expect(200)).body as LinkResponse).pinnedInFolderAt).toBeNull();
    const page = await list();
    expect(page.pinned).toEqual([]);
    expect(titles(page.items)).toEqual(['x']);
  });

  it('needs a folder (400 in Unsorted) and a move to another folder unpins', async () => {
    const loose = await seed('loose', null);
    await pin(loose).expect(400);
    const x = await seed('x');
    await pin(x).expect(200);
    const other = (
      (await a.post('/api/folders').send({ name: 'Other' }).expect(201)).body as FolderResponse
    ).id;
    const moved = (await a.patch(`${LINKS}/${x}`).send({ folderId: other }).expect(200))
      .body as LinkResponse;
    expect(moved.pinnedInFolderAt).toBeNull();
    // Moving and pinning in one request pins in the new folder.
    const again = (
      await a.patch(`${LINKS}/${x}`).send({ folderId: folderId, pinnedInFolder: true }).expect(200)
    ).body as LinkResponse;
    expect(again.pinnedInFolderAt).not.toBeNull();
    const toUnsorted = (await a.patch(`${LINKS}/${x}`).send({ folderId: null }).expect(200))
      .body as LinkResponse;
    expect(toUnsorted.pinnedInFolderAt).toBeNull();
    await a.patch(`${LINKS}/${x}`).send({ folderId: null, pinnedInFolder: true }).expect(400);
  });

  it(`allows ${LINK_LIMIT.PinnedInFolderMax} per folder and answers 409 beyond`, async () => {
    const ids: string[] = [];
    for (let i = 0; i <= LINK_LIMIT.PinnedInFolderMax; i++) ids.push(await seed(`l${i}`));
    for (const id of ids.slice(0, LINK_LIMIT.PinnedInFolderMax)) await pin(id).expect(200);
    await pin(ids[LINK_LIMIT.PinnedInFolderMax] as string).expect(409);
    await pin(ids[0] as string).expect(200);
    expect((await list()).pinned).toHaveLength(LINK_LIMIT.PinnedInFolderMax);
  });

  it('rejects a non-boolean value', async () => {
    const x = await seed('x');
    await a.patch(`${LINKS}/${x}`).send({ pinnedInFolder: 'yes' }).expect(400);
    await a.patch(`${LINKS}/${x}`).send({ pinnedInFolder: null }).expect(400);
    await a.patch(`${LINKS}/${x}`).send({ pinnedInFolderAt: '2020-01-01' }).expect(400);
  });

  it("is isolated: B cannot pin A's link (404) and does not see A's pins", async () => {
    const x = await seed('x');
    await b.patch(`${LINKS}/${x}`).send({ pinnedInFolder: true }).expect(404);
    await pin(x).expect(200);
    await b.get(LINKS).query({ folderId }).expect(200);
    const bList = (await b.get(LINKS).query({ folderId }).expect(200)).body as ListLinksResponse;
    expect(bList.pinned).toEqual([]);
    expect(bList.items).toEqual([]);
  });

  it('a link in Trash is not listed as pinned, and restore does not pin it again', async () => {
    const x = await seed('x');
    const y = await seed('y');
    await pin(x).expect(200);
    await pin(y).expect(200);
    await a.delete(`${LINKS}/${x}`).expect(204);
    expect(titles((await list()).pinned)).toEqual(['y']);
    await a
      .post('/api/trash/restore')
      .send({ items: [{ kind: 'link', id: x }] })
      .expect(200);
    const page = await list();
    expect(titles(page.pinned)).toEqual(['y']);
    expect(titles(page.items)).toEqual(['x']);
  });

  it('deleting the folder in move-to-unsorted mode unpins the links that stay', async () => {
    const x = await seed('x');
    await pin(x).expect(200);
    await a.delete(`/api/folders/${folderId}`).query({ mode: 'move-to-unsorted' }).expect(204);
    const got = (await a.get(`${LINKS}/${x}`).expect(200)).body as LinkResponse;
    expect(got).toMatchObject({ folderId: null, pinnedInFolderAt: null });
  });
});
