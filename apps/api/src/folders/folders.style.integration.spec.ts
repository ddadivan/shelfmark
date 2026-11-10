import {
  FOLDER_COLOUR,
  FOLDER_DEFAULT_COLOUR,
  FOLDER_DEFAULT_ICON,
  FOLDER_ICON,
  type FolderResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';

const FOLDERS = '/api/folders';

describe('folder colour and icon', () => {
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

  const create = async (name = 'Work'): Promise<FolderResponse> =>
    (await asUser(t.app, users.owner).post(FOLDERS).send({ name }).expect(201))
      .body as FolderResponse;

  it('new folders are plain graphite with the folder icon and not pinned', async () => {
    const folder = await create();
    expect(folder).toMatchObject({
      colour: FOLDER_DEFAULT_COLOUR,
      icon: FOLDER_DEFAULT_ICON,
      pinned: false,
    });
  });

  it.each(Object.values(FOLDER_COLOUR))('saves the colour %s', async (colour) => {
    const folder = await create();
    const res = await asUser(t.app, users.owner)
      .patch(`${FOLDERS}/${folder.id}`)
      .send({ colour })
      .expect(200);
    expect((res.body as FolderResponse).colour).toBe(colour);
  });

  it.each(Object.values(FOLDER_ICON))('saves the icon %s', async (icon) => {
    const folder = await create();
    const res = await asUser(t.app, users.owner)
      .patch(`${FOLDERS}/${folder.id}`)
      .send({ icon })
      .expect(200);
    expect((res.body as FolderResponse).icon).toBe(icon);
  });

  it('saves both together, keeps them across reads and lists them', async () => {
    const folder = await create();
    const a = asUser(t.app, users.owner);
    await a
      .patch(`${FOLDERS}/${folder.id}`)
      .send({ colour: 'plum', icon: 'bookmark', name: 'Renamed' })
      .expect(200);
    expect((await a.get(`${FOLDERS}/${folder.id}`).expect(200)).body).toMatchObject({
      colour: 'plum',
      icon: 'bookmark',
      name: 'Renamed',
    });
    const list = (await a.get(FOLDERS).expect(200)).body as { items: FolderResponse[] };
    expect(list.items[0]).toMatchObject({ colour: 'plum', icon: 'bookmark' });
  });

  it.each([
    [{ colour: 'purple' }],
    [{ colour: 'GRAPHITE' }],
    [{ colour: null }],
    [{ colour: 1 }],
    [{ icon: 'rocket' }],
    [{ icon: 'chevron-down' }],
    [{ icon: null }],
    [{ icon: ['folder'] }],
    [{ pinned: true }],
    [{ pinnedPosition: 0 }],
  ])('rejects %j with 400 and changes nothing', async (body) => {
    const folder = await create();
    const a = asUser(t.app, users.owner);
    await a.patch(`${FOLDERS}/${folder.id}`).send(body).expect(400);
    expect((await a.get(`${FOLDERS}/${folder.id}`).expect(200)).body).toMatchObject({
      colour: FOLDER_DEFAULT_COLOUR,
      icon: FOLDER_DEFAULT_ICON,
      pinned: false,
    });
  });

  it("is isolated: another user cannot style a user's folder (404)", async () => {
    const folder = await create();
    await asUser(t.app, users.intruder)
      .patch(`${FOLDERS}/${folder.id}`)
      .send({ colour: 'rose' })
      .expect(404);
    expect(
      (await asUser(t.app, users.owner).get(`${FOLDERS}/${folder.id}`).expect(200)).body,
    ).toMatchObject({ colour: FOLDER_DEFAULT_COLOUR });
  });
});
