import {
  READER_PAGE_THEME,
  READER_PREFERENCES_DEFAULT,
  READER_TEXT_FONT,
  READER_TEXT_MEASURE,
  READER_TEXT_SIZE_RANGE,
  READER_TEXT_SPACING,
  USER_SETTINGS_ENDPOINT,
  type ReaderPreferences,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';

const READER: ReaderPreferences = {
  readerTheme: READER_PAGE_THEME.Sepia,
  readerFont: READER_TEXT_FONT.Serif,
  readerSize: 21,
  readerLineSpacing: READER_TEXT_SPACING.Relaxed,
  readerLineWidth: READER_TEXT_MEASURE.Wide,
};

describe('account settings: reading settings of Reader', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
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

  const settings = async (agent: TestAgent = a): Promise<UserSettingsResponse> =>
    (await agent.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse;

  it('defaults to following the app, Sans, 18px, normal, unsaved', async () => {
    expect(await settings()).toMatchObject({ ...READER_PREFERENCES_DEFAULT, readerSaved: false });
  });

  it('saves every reading setting, marks them saved and leaves the appearance alone', async () => {
    const res = await a.patch(USER_SETTINGS_ENDPOINT).send(READER).expect(200);
    expect(res.body).toMatchObject({ ...READER, readerSaved: true, appearanceSaved: false });
    expect(await settings()).toEqual(res.body);
  });

  it('changes only the fields sent, and null follows the app theme again', async () => {
    await a.patch(USER_SETTINGS_ENDPOINT).send(READER).expect(200);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ readerSize: 15, readerTheme: null }).expect(200);
    expect(await settings()).toMatchObject({ ...READER, readerSize: 15, readerTheme: null });
  });

  it('does not mark them saved for other settings', async () => {
    await a.patch(USER_SETTINGS_ENDPOINT).send({ folderColours: false }).expect(200);
    expect((await settings()).readerSaved).toBe(false);
  });

  it.each([
    ['an unknown theme', { readerTheme: 'neon' }],
    ['an unknown font', { readerFont: 'comic' }],
    ['a null font', { readerFont: null }],
    ['a size below the range', { readerSize: READER_TEXT_SIZE_RANGE.Min - 1 }],
    ['a size above the range', { readerSize: READER_TEXT_SIZE_RANGE.Max + 1 }],
    ['a fractional size', { readerSize: 17.5 }],
    ['a string size', { readerSize: '18' }],
    ['an unknown spacing', { readerLineSpacing: 'double' }],
    ['an unknown width', { readerLineWidth: 'full' }],
  ])('refuses %s with a 400 and saves nothing', async (_name, body) => {
    await a.patch(USER_SETTINGS_ENDPOINT).send(body).expect(400);
    expect((await settings()).readerSaved).toBe(false);
  });

  it('is isolated: one user’s reading settings never reach another', async () => {
    const b = asUser(t.app, users.intruder);
    await a.patch(USER_SETTINGS_ENDPOINT).send(READER).expect(200);
    expect(await settings(b)).toMatchObject({ ...READER_PREFERENCES_DEFAULT, readerSaved: false });
    await b.patch(USER_SETTINGS_ENDPOINT).send({ readerSize: 14 }).expect(200);
    expect((await settings()).readerSize).toBe(READER.readerSize);
  });

  it('needs a session', async () => {
    await anonymous(t.app).patch(USER_SETTINGS_ENDPOINT).send({ readerSize: 20 }).expect(401);
  });

  it('is enforced by the database CHECKs', async () => {
    const id = users.owner.userId;
    for (const data of [
      { readerTheme: 'neon' },
      { readerFont: 'comic' },
      { readerSize: 30 },
      { readerSize: 13 },
      { readerLineSpacing: 'double' },
      { readerLineWidth: 'full' },
    ]) {
      await expect(t.db.prisma.user.update({ where: { id }, data })).rejects.toThrow();
    }
  });
});
