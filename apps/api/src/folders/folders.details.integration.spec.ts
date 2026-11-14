import { FOLDER_LIMIT, type FolderResponse } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';

const FOLDERS = '/api/folders';

/** The folder details of #418: the description (and the cover, below). */
describe('folder description', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const create = async (name = 'Recipes'): Promise<FolderResponse> =>
    (await asUser(t.app, users.owner).post(FOLDERS).send({ name }).expect(201))
      .body as FolderResponse;

  it('a new folder has no description', async () => {
    expect((await create()).description).toBeNull();
  });

  it('saves a trimmed description, lists it and removes it with blank text or null', async () => {
    const folder = await create();
    const a = asUser(t.app, users.owner);
    const saved = await a
      .patch(`${FOLDERS}/${folder.id}`)
      .send({ description: '  Dishes worth cooking twice  ' })
      .expect(200);
    expect((saved.body as FolderResponse).description).toBe('Dishes worth cooking twice');
    const list = (await a.get(FOLDERS).expect(200)).body as { items: FolderResponse[] };
    expect(list.items[0]?.description).toBe('Dishes worth cooking twice');

    const blank = await a.patch(`${FOLDERS}/${folder.id}`).send({ description: '   ' }).expect(200);
    expect((blank.body as FolderResponse).description).toBeNull();

    await a.patch(`${FOLDERS}/${folder.id}`).send({ description: 'Again' }).expect(200);
    const cleared = await a
      .patch(`${FOLDERS}/${folder.id}`)
      .send({ description: null })
      .expect(200);
    expect((cleared.body as FolderResponse).description).toBeNull();
  });

  it('keeps the description when other fields change', async () => {
    const folder = await create();
    const a = asUser(t.app, users.owner);
    await a.patch(`${FOLDERS}/${folder.id}`).send({ description: 'Weeknight food' }).expect(200);
    const renamed = await a.patch(`${FOLDERS}/${folder.id}`).send({ name: 'Food' }).expect(200);
    expect(renamed.body as FolderResponse).toMatchObject({
      name: 'Food',
      description: 'Weeknight food',
    });
  });

  it('accepts exactly the maximum length after trimming', async () => {
    const folder = await create();
    const text = 'x'.repeat(FOLDER_LIMIT.DescriptionMax);
    const res = await asUser(t.app, users.owner)
      .patch(`${FOLDERS}/${folder.id}`)
      .send({ description: ` ${text} ` })
      .expect(200);
    expect((res.body as FolderResponse).description).toBe(text);
  });

  it.each([
    [{ description: 'x'.repeat(FOLDER_LIMIT.DescriptionMax + 1) }],
    [{ description: 'tab\tinside' }],
    [{ description: 'line\nbreak' }],
    [{ description: 'nul\u0000byte' }],
    [{ description: 42 }],
    [{ description: ['a'] }],
    [{ description: { text: 'a' } }],
  ])('rejects %j with 400 and changes nothing', async (body) => {
    const folder = await create();
    const a = asUser(t.app, users.owner);
    await a.patch(`${FOLDERS}/${folder.id}`).send({ description: 'Kept' }).expect(200);
    await a.patch(`${FOLDERS}/${folder.id}`).send(body).expect(400);
    expect((await a.get(`${FOLDERS}/${folder.id}`).expect(200)).body).toMatchObject({
      description: 'Kept',
    });
  });

  it('the database keeps a description non-empty and within the limit', async () => {
    const folder = await create();
    for (const description of ['', 'x'.repeat(FOLDER_LIMIT.DescriptionMax + 1)]) {
      await expect(
        t.db.prisma.folder.update({ where: { id: folder.id }, data: { description } }),
      ).rejects.toThrow();
    }
  });

  it("is isolated: another user can neither read nor write a user's description (404)", async () => {
    const folder = await create();
    const owner = asUser(t.app, users.owner);
    await owner.patch(`${FOLDERS}/${folder.id}`).send({ description: 'Private notes' }).expect(200);
    const intruder = asUser(t.app, users.intruder);
    await intruder.get(`${FOLDERS}/${folder.id}`).expect(404);
    await intruder.patch(`${FOLDERS}/${folder.id}`).send({ description: 'Mine now' }).expect(404);
    const list = (await intruder.get(FOLDERS).expect(200)).body as { items: FolderResponse[] };
    expect(list.items).toEqual([]);
    expect((await owner.get(`${FOLDERS}/${folder.id}`).expect(200)).body).toMatchObject({
      description: 'Private notes',
    });
  });
});
