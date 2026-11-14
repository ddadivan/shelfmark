import {
  PIN_ENDPOINT,
  PIN_KIND,
  PIN_LIMIT,
  type FolderResponse,
  type LinkResponse,
  type ListPinsResponse,
  type PinKind,
  type PinRef,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';

describe('sidebar pins', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
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

  const folder = async (agent: TestAgent, name: string): Promise<PinRef> => ({
    kind: PIN_KIND.Folder,
    id: ((await agent.post('/api/folders').send({ name }).expect(201)).body as FolderResponse).id,
  });
  const link = async (agent: TestAgent, title: string): Promise<PinRef> => ({
    kind: PIN_KIND.Link,
    id: (
      (await agent.post('/api/links').send({ url: 'https://example.com/x', title }).expect(201))
        .body as LinkResponse
    ).id,
  });
  const pins = async (agent: TestAgent): Promise<PinRef[]> =>
    ((await agent.get(PIN_ENDPOINT).expect(200)).body as ListPinsResponse).items.map((item) => ({
      kind: item.kind,
      id: (item.folder ?? item.link)?.id ?? '',
    }));
  const trashFolder = (id: string) =>
    a.delete(`/api/folders/${id}`).query({ mode: 'delete-links' }).expect(204);

  it('starts empty and lists pins in the order they were added, folders and links mixed', async () => {
    expect(await pins(a)).toEqual([]);
    const f = await folder(a, 'Work');
    const l = await link(a, 'Spec');
    const g = await folder(a, 'Misc');
    for (const ref of [l, f, g]) await a.post(PIN_ENDPOINT).send(ref).expect(200);
    const body = (await a.get(PIN_ENDPOINT).expect(200)).body as ListPinsResponse;
    expect(body.items.map((item) => item.position)).toEqual([0, 1, 2]);
    expect(await pins(a)).toEqual([l, f, g]);
    expect(body.items[0]?.link?.pinned).toBe(true);
    expect(body.items[1]?.folder).toMatchObject({ pinned: true, name: 'Work' });
    expect(body.items[1]?.link).toBeNull();
  });

  it('pinning again changes nothing; unpinning twice is fine', async () => {
    const f = await folder(a, 'Work');
    await a.post(PIN_ENDPOINT).send(f).expect(200);
    await a.post(PIN_ENDPOINT).send(f).expect(200);
    expect(await pins(a)).toEqual([f]);
    await a.delete(`${PIN_ENDPOINT}/folder/${f.id}`).expect(204);
    await a.delete(`${PIN_ENDPOINT}/folder/${f.id}`).expect(204);
    expect(await pins(a)).toEqual([]);
    expect((await a.get(`/api/folders/${f.id}`).expect(200)).body).toMatchObject({
      pinned: false,
    });
  });

  it('does not touch updatedAt', async () => {
    const f = await folder(a, 'Work');
    const before = ((await a.get(`/api/folders/${f.id}`).expect(200)).body as FolderResponse)
      .updatedAt;
    await a.post(PIN_ENDPOINT).send(f).expect(200);
    const after = ((await a.get(`/api/folders/${f.id}`).expect(200)).body as FolderResponse)
      .updatedAt;
    expect(after).toBe(before);
  });

  it(`allows ${PIN_LIMIT.Max} pins and answers 409 for one more`, async () => {
    const refs: PinRef[] = [];
    for (let i = 0; i < PIN_LIMIT.Max; i++) {
      refs.push(i % 2 === 0 ? await folder(a, `F${i}`) : await link(a, `L${i}`));
    }
    for (const ref of refs) await a.post(PIN_ENDPOINT).send(ref).expect(200);
    const extra = await folder(a, 'One too many');
    await a.post(PIN_ENDPOINT).send(extra).expect(409);
    // Re-pinning an already pinned item at the limit is still fine, and unpinning frees a place.
    await a.post(PIN_ENDPOINT).send(refs[0]).expect(200);
    await a.delete(`${PIN_ENDPOINT}/${refs[0]?.kind}/${refs[0]?.id}`).expect(204);
    await a.post(PIN_ENDPOINT).send(extra).expect(200);
    expect(await pins(a)).toHaveLength(PIN_LIMIT.Max);
  });

  it('the limit is per user', async () => {
    for (let i = 0; i < PIN_LIMIT.Max; i++) {
      const ref = await folder(a, `F${i}`);
      await a.post(PIN_ENDPOINT).send(ref).expect(200);
    }
    const mine = await folder(b, 'Mine');
    await b.post(PIN_ENDPOINT).send(mine).expect(200);
    expect(await pins(b)).toHaveLength(1);
  });

  it('reorders, and rejects anything that is not exactly the pinned set', async () => {
    const f = await folder(a, 'Work');
    const l = await link(a, 'Spec');
    const g = await folder(a, 'Misc');
    const extra = await folder(a, 'Unpinned');
    for (const ref of [f, l, g]) await a.post(PIN_ENDPOINT).send(ref).expect(200);

    const res = await a
      .put(`${PIN_ENDPOINT}/order`)
      .send({ items: [g, f, l] })
      .expect(200);
    expect((res.body as ListPinsResponse).items.map((i) => (i.folder ?? i.link)?.id)).toEqual([
      g.id,
      f.id,
      l.id,
    ]);
    expect(await pins(a)).toEqual([g, f, l]);
    // A new pin goes to the end.
    await a.delete(`${PIN_ENDPOINT}/folder/${f.id}`).expect(204);
    await a.post(PIN_ENDPOINT).send(extra).expect(200);
    expect(await pins(a)).toEqual([g, l, extra]);

    for (const items of [[g, l], [g, l, extra, f], [g, g, l], [g, l, f], []]) {
      await a.put(`${PIN_ENDPOINT}/order`).send({ items }).expect(400);
    }
    expect(await pins(a)).toEqual([g, l, extra]);
    await a
      .put(`${PIN_ENDPOINT}/order`)
      .send({ items: [{ kind: 'tag', id: g.id }] })
      .expect(400);
    await a.put(`${PIN_ENDPOINT}/order`).send({ items: 'x' }).expect(400);
    await a.put(`${PIN_ENDPOINT}/order`).send({ items: [], extra: 1 }).expect(400);
  });

  it('validates bodies and params', async () => {
    const f = await folder(a, 'Work');
    await a.post(PIN_ENDPOINT).send({ kind: 'tag', id: f.id }).expect(400);
    await a.post(PIN_ENDPOINT).send({ kind: 'folder', id: 'nope' }).expect(400);
    await a
      .post(PIN_ENDPOINT)
      .send({ ...f, position: 0 })
      .expect(400);
    await a.delete(`${PIN_ENDPOINT}/tag/${f.id}`).expect(400);
    await a.delete(`${PIN_ENDPOINT}/folder/nope`).expect(400);
  });

  it("is isolated: B cannot pin, unpin or reorder what is A's, and never sees A's pins", async () => {
    const f = await folder(a, 'Work');
    const l = await link(a, 'Spec');
    await a.post(PIN_ENDPOINT).send(f).expect(200);
    await b.post(PIN_ENDPOINT).send(l).expect(404);
    await b.post(PIN_ENDPOINT).send(f).expect(404);
    await b.delete(`${PIN_ENDPOINT}/folder/${f.id}`).expect(404);
    expect(await pins(b)).toEqual([]);
    await b
      .put(`${PIN_ENDPOINT}/order`)
      .send({ items: [f] })
      .expect(400);
    expect(await pins(a)).toEqual([f]);
    // The kind is not interchangeable either.
    await a.post(PIN_ENDPOINT).send({ kind: 'link', id: f.id }).expect(404);
    await a.post(PIN_ENDPOINT).send({ kind: 'folder', id: l.id }).expect(404);
    await a
      .post(PIN_ENDPOINT)
      .send({ kind: 'folder', id: '00000000-0000-4000-8000-000000000000' })
      .expect(404);
  });

  it('requires a session', async () => {
    const { anonymous } = await import('../../test-utils/isolation/test-agent');
    await anonymous(t.app).get(PIN_ENDPOINT).expect(401);
    await anonymous(t.app).post(PIN_ENDPOINT).send({ kind: 'folder', id: 'x' }).expect(401);
  });

  describe('Trash', () => {
    it('a trashed folder or link drops out, is not pinnable and frees its place', async () => {
      const f = await folder(a, 'Work');
      const l = await link(a, 'Spec');
      await a.post(PIN_ENDPOINT).send(f).expect(200);
      await a.post(PIN_ENDPOINT).send(l).expect(200);
      await trashFolder(f.id);
      await a.delete(`/api/links/${l.id}`).expect(204);
      expect(await pins(a)).toEqual([]);
      await a.post(PIN_ENDPOINT).send(f).expect(404);
      await a.post(PIN_ENDPOINT).send(l).expect(404);
      await a.delete(`${PIN_ENDPOINT}/${f.kind}/${f.id}`).expect(404);
    });

    it('restoring does not bring the pin back, so the limit cannot be exceeded', async () => {
      const f = await folder(a, 'Work');
      await a.post(PIN_ENDPOINT).send(f).expect(200);
      await trashFolder(f.id);
      await a
        .post('/api/trash/restore')
        .send({ items: [f] })
        .expect(200);
      expect((await a.get(`/api/folders/${f.id}`).expect(200)).body).toMatchObject({
        pinned: false,
      });
      expect(await pins(a)).toEqual([]);
    });

    it('subfolders and links trashed with a folder are unpinned; moved links stay out of Trash', async () => {
      const parent = await folder(a, 'Parent');
      const child = (
        await a.post('/api/folders').send({ name: 'Child', parentId: parent.id }).expect(201)
      ).body as FolderResponse;
      const inside = (
        await a
          .post('/api/links')
          .send({ url: 'https://example.com/y', title: 'In', folderId: child.id })
          .expect(201)
      ).body as LinkResponse;
      await a.post(PIN_ENDPOINT).send({ kind: 'folder', id: child.id }).expect(200);
      await a.post(PIN_ENDPOINT).send({ kind: 'link', id: inside.id }).expect(200);
      await a.delete(`/api/folders/${parent.id}`).query({ mode: 'move-to-unsorted' }).expect(204);
      // The subfolder is gone, the link moved to Unsorted and keeps its sidebar pin.
      expect(await pins(a)).toEqual([{ kind: PIN_KIND.Link, id: inside.id }]);
    });

    it('delete forever removes the pin rows with the target', async () => {
      const f = await folder(a, 'Work');
      await a.post(PIN_ENDPOINT).send(f).expect(200);
      await trashFolder(f.id);
      await a
        .post('/api/trash/delete')
        .send({ items: [f] })
        .expect(200);
      expect(await pins(a)).toEqual([]);
      expect(await t.db.prisma.folder.count()).toBe(0);
    });
  });

  it.each([PIN_KIND.Folder, PIN_KIND.Link] as PinKind[])(
    'shows the %s counts and style in the pin list',
    async (kind) => {
      const f = await folder(a, 'Styled');
      await a.patch(`/api/folders/${f.id}`).send({ colour: 'teal', icon: 'star' }).expect(200);
      await a
        .post('/api/links')
        .send({ url: 'https://example.com/z', title: 'Z', folderId: f.id })
        .expect(201);
      const target = kind === PIN_KIND.Folder ? f : await link(a, 'Loose');
      await a.post(PIN_ENDPOINT).send(target).expect(200);
      const item = ((await a.get(PIN_ENDPOINT).expect(200)).body as ListPinsResponse).items[0];
      if (kind === PIN_KIND.Folder) {
        expect(item?.folder).toMatchObject({ colour: 'teal', icon: 'star', linkCount: 1 });
      } else {
        expect(item?.link).toMatchObject({ title: 'Loose', pinned: true });
      }
    },
  );
});
