import {
  FOLDER_ERROR_MESSAGE,
  FOLDER_LIMIT,
  type FolderResponse,
  type LinkResponse,
} from '@shelfmark/contracts';
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

describe('folder cover', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  const SHA = 'ab'.repeat(32);

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

  const folderOf = async (
    user: IsolationUsers['owner'],
    name = 'Recipes',
  ): Promise<FolderResponse> =>
    (await asUser(t.app, user).post(FOLDERS).send({ name }).expect(201)).body as FolderResponse;

  /** A link of `user` in `folderId` with a stored preview image. */
  const linkIn = async (
    user: IsolationUsers['owner'],
    folderId: string | null,
  ): Promise<LinkResponse> => {
    const link = (
      await asUser(t.app, user)
        .post('/api/links')
        .send({
          url: `https://example.com/${globalThis.crypto.randomUUID()}`,
          title: 'Tart',
          ...(folderId !== null && { folderId }),
        })
        .expect(201)
    ).body as LinkResponse;
    await t.db.prisma.linkImage.create({
      data: {
        userId: user.userId,
        linkId: link.id,
        kind: 'preview',
        contentType: 'image/webp',
        bytes: Buffer.from('x'),
        width: 1,
        height: 1,
        sha256: SHA,
      },
    });
    return link;
  };

  it('sets a link of the folder as the cover, answers its preview path and removes it with null', async () => {
    const folder = await folderOf(users.owner);
    const link = await linkIn(users.owner, folder.id);
    const a = asUser(t.app, users.owner);

    const res = await a.patch(`${FOLDERS}/${folder.id}`).send({ coverLinkId: link.id }).expect(200);
    const expected = `/api/links/${link.id}/image?v=${SHA.slice(0, 16)}`;
    expect(res.body as FolderResponse).toMatchObject({ coverLinkId: link.id, coverUrl: expected });
    const list = (await a.get(FOLDERS).expect(200)).body as { items: FolderResponse[] };
    expect(list.items[0]).toMatchObject({ coverLinkId: link.id, coverUrl: expected });
    expect((await a.get(`${FOLDERS}/${folder.id}`).expect(200)).body).toMatchObject({
      coverUrl: expected,
    });

    const cleared = await a
      .patch(`${FOLDERS}/${folder.id}`)
      .send({ coverLinkId: null })
      .expect(200);
    expect(cleared.body as FolderResponse).toMatchObject({ coverLinkId: null, coverUrl: null });
  });

  it('answers no cover while the link is moved away or in Trash, and the cover again after', async () => {
    const folder = await folderOf(users.owner);
    const link = await linkIn(users.owner, folder.id);
    const a = asUser(t.app, users.owner);
    await a.patch(`${FOLDERS}/${folder.id}`).send({ coverLinkId: link.id }).expect(200);

    await a.patch(`/api/links/${link.id}`).send({ folderId: null }).expect(200);
    expect((await a.get(`${FOLDERS}/${folder.id}`).expect(200)).body).toMatchObject({
      coverLinkId: null,
      coverUrl: null,
    });
    await a.patch(`/api/links/${link.id}`).send({ folderId: folder.id }).expect(200);
    expect((await a.get(`${FOLDERS}/${folder.id}`).expect(200)).body).toMatchObject({
      coverLinkId: link.id,
    });

    await a.delete(`/api/links/${link.id}`).expect(204);
    const list = (await a.get(FOLDERS).expect(200)).body as { items: FolderResponse[] };
    expect(list.items[0]).toMatchObject({ coverLinkId: null, coverUrl: null });
  });

  it('refuses a link of another folder, Unsorted, a missing or a trashed link with 404', async () => {
    const folder = await folderOf(users.owner);
    const other = await folderOf(users.owner, 'Other');
    const a = asUser(t.app, users.owner);
    const elsewhere = await linkIn(users.owner, other.id);
    const unsorted = await linkIn(users.owner, null);
    const trashed = await linkIn(users.owner, folder.id);
    await a.delete(`/api/links/${trashed.id}`).expect(204);

    for (const coverLinkId of [
      elsewhere.id,
      unsorted.id,
      trashed.id,
      '018f0000-0000-7000-8000-00000000dead',
    ]) {
      const res = await a.patch(`${FOLDERS}/${folder.id}`).send({ coverLinkId }).expect(404);
      expect((res.body as { message: string }).message).toBe(FOLDER_ERROR_MESSAGE.CoverNotFound);
    }
    expect((await a.get(`${FOLDERS}/${folder.id}`).expect(200)).body).toMatchObject({
      coverLinkId: null,
    });
  });

  it.each([[{ coverLinkId: 'not-a-uuid' }], [{ coverLinkId: 42 }], [{ coverUrl: '/x' }]])(
    'rejects %j with 400',
    async (body) => {
      const folder = await folderOf(users.owner);
      await asUser(t.app, users.owner).patch(`${FOLDERS}/${folder.id}`).send(body).expect(400);
    },
  );

  it("is isolated: a user cannot use another user's link as a cover, nor touch their folder (404)", async () => {
    const owners = await folderOf(users.owner);
    const ownersLink = await linkIn(users.owner, owners.id);
    const intruders = await folderOf(users.intruder, 'Mine');
    const intruder = asUser(t.app, users.intruder);

    const res = await intruder
      .patch(`${FOLDERS}/${intruders.id}`)
      .send({ coverLinkId: ownersLink.id })
      .expect(404);
    expect((res.body as { message: string }).message).toBe(FOLDER_ERROR_MESSAGE.CoverNotFound);
    await intruder
      .patch(`${FOLDERS}/${owners.id}`)
      .send({ coverLinkId: ownersLink.id })
      .expect(404);

    // A cover id written behind the API's back still never leaks another user's link.
    await t.db.prisma.folder.update({
      where: { id: intruders.id },
      data: { coverLinkId: ownersLink.id },
    });
    expect((await intruder.get(`${FOLDERS}/${intruders.id}`).expect(200)).body).toMatchObject({
      coverLinkId: null,
      coverUrl: null,
    });
    expect(
      (await asUser(t.app, users.owner).get(`${FOLDERS}/${owners.id}`).expect(200)).body,
    ).toMatchObject({ coverLinkId: null });
  });
});
