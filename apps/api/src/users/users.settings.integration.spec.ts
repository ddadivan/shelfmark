import {
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUND,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  CUSTOM_THEME_DEFAULT,
  type CustomTheme,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  TRASH_RETENTION_DAYS,
  USER_SETTINGS_ENDPOINT,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { signInDemo } from '../../test-utils/sign-in-demo';

const APPEARANCE_DEFAULTS = {
  theme: THEME_PREFERENCE.System,
  customTheme: CUSTOM_THEME_DEFAULT,
  motion: MOTION_PREFERENCE.System,
};

describe('account settings', () => {
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

  const stored = async (userId: string): Promise<number> =>
    (await t.db.prisma.user.findUniqueOrThrow({ where: { id: userId } })).trashRetentionDays;

  it('defaults to 30 days', async () => {
    const res = await asUser(t.app, users.owner).get(USER_SETTINGS_ENDPOINT).expect(200);
    expect(res.body).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
    });
  });

  it.each(TRASH_RETENTION_DAYS)('saves %i days and reads it back', async (days) => {
    const a = asUser(t.app, users.owner);
    const res = await a
      .patch(USER_SETTINGS_ENDPOINT)
      .send({ trashRetentionDays: days })
      .expect(200);
    expect((res.body as UserSettingsResponse).trashRetentionDays).toBe(days);
    expect(await stored(users.owner.userId)).toBe(days);
    expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
      trashRetentionDays: days,
      folderColours: true,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
    });
  });

  it('answers the current settings for an empty PATCH', async () => {
    const a = asUser(t.app, users.owner);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 90 }).expect(200);
    expect((await a.patch(USER_SETTINGS_ENDPOINT).send({}).expect(200)).body).toEqual({
      trashRetentionDays: 90,
      folderColours: true,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
    });
  });

  it.each([[15], [0], [-7], ['30'], [null], [7.5], [[7]]])(
    'rejects %j with 400 and changes nothing',
    async (value) => {
      const a = asUser(t.app, users.owner);
      await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: value }).expect(400);
      expect(await stored(users.owner.userId)).toBe(30);
    },
  );

  it('saves folderColours independently of the retention', async () => {
    const a = asUser(t.app, users.owner);
    const off = await a
      .patch(USER_SETTINGS_ENDPOINT)
      .send({ folderColours: false, pauseHistory: false, ...APPEARANCE_DEFAULTS })
      .expect(200);
    expect(off.body).toEqual({
      trashRetentionDays: 30,
      folderColours: false,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
    });
    const day = await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7 }).expect(200);
    expect(day.body).toEqual({
      trashRetentionDays: 7,
      folderColours: false,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
    });
    expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual(day.body);
    const other = asUser(t.app, users.intruder);
    expect((await other.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
    });
  });

  it.each([['false'], [null], [0], [1]])('rejects folderColours %j with 400', async (value) => {
    const a = asUser(t.app, users.owner);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ folderColours: value }).expect(400);
  });

  it('rejects extra fields', async () => {
    const a = asUser(t.app, users.owner);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7, isDemo: true }).expect(400);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ userId: users.intruder.userId }).expect(400);
    expect(await stored(users.owner.userId)).toBe(30);
  });

  it('is isolated: a user only reads and writes their own settings', async () => {
    const a = asUser(t.app, users.owner);
    const b = asUser(t.app, users.intruder);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7 }).expect(200);
    expect((await b.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
    });
    await b.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 90 }).expect(200);
    expect(await stored(users.owner.userId)).toBe(7);
    expect(await stored(users.intruder.userId)).toBe(90);
  });

  it('works for demo users', async () => {
    const demo = asUser(t.app, await signInDemo(t.app, t.baseUrl));
    expect((await demo.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
    });
    expect(
      (await demo.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7 }).expect(200)).body,
    ).toEqual({
      trashRetentionDays: 7,
      folderColours: true,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
    });
  });

  it('needs a session, a JSON body and the same origin', async () => {
    await anonymous(t.app).get(USER_SETTINGS_ENDPOINT).expect(401);
    await anonymous(t.app)
      .patch(USER_SETTINGS_ENDPOINT)
      .send({ trashRetentionDays: 7 })
      .expect(401);
    const a = asUser(t.app, users.owner);
    await a
      .patch(USER_SETTINGS_ENDPOINT)
      .set('Origin', 'https://evil.test')
      .send({ trashRetentionDays: 7 })
      .expect(403);
    expect(await stored(users.owner.userId)).toBe(30);
  });

  it('is enforced by the database CHECK', async () => {
    await expect(
      t.db.prisma.user.update({
        where: { id: users.owner.userId },
        data: { trashRetentionDays: 15 },
      }),
    ).rejects.toThrow();
  });

  describe('appearance (#273)', () => {
    const dark: CustomTheme = {
      base: CUSTOM_THEME_BASE.Dark,
      accent: CUSTOM_THEME_ACCENT.Rose,
      background: CUSTOM_THEME_BACKGROUND.Ink,
      corners: CUSTOM_THEME_CORNERS.Square,
    };

    it.each(Object.values(THEME_PREFERENCE))('saves theme %s', async (theme) => {
      const a = asUser(t.app, users.owner);
      const res = await a.patch(USER_SETTINGS_ENDPOINT).send({ theme }).expect(200);
      expect((res.body as UserSettingsResponse).theme).toBe(theme);
      expect(
        ((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse).theme,
      ).toBe(theme);
    });

    it.each(Object.values(MOTION_PREFERENCE))('saves motion %s', async (motion) => {
      const a = asUser(t.app, users.owner);
      const res = await a.patch(USER_SETTINGS_ENDPOINT).send({ motion }).expect(200);
      expect((res.body as UserSettingsResponse).motion).toBe(motion);
    });

    it('saves the whole custom theme with the theme, and keeps the other settings', async () => {
      const a = asUser(t.app, users.owner);
      await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7 }).expect(200);
      const res = await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ theme: THEME_PREFERENCE.Custom, customTheme: dark })
        .expect(200);
      expect(res.body).toEqual({
        trashRetentionDays: 7,
        folderColours: true,
        pauseHistory: false,
        theme: THEME_PREFERENCE.Custom,
        customTheme: dark,
        motion: MOTION_PREFERENCE.System,
      });
      // Choosing another theme keeps the custom one for later.
      const light = await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ theme: THEME_PREFERENCE.Light })
        .expect(200);
      expect((light.body as UserSettingsResponse).customTheme).toEqual(dark);
    });

    it.each([
      [{ theme: 'sepia' }],
      [{ theme: null }],
      [{ theme: 1 }],
      [{ motion: 'none' }],
      [{ motion: null }],
      [{ customTheme: null }],
      [{ customTheme: 'dark' }],
      [{ customTheme: [] }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, accent: '#ff0000' } }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, accent: 'red' } }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, corners: 'pill' } }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, base: 'sepia' } }],
      // A background of the other base.
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, background: CUSTOM_THEME_BACKGROUND.Black } }],
      [{ customTheme: { ...dark, background: CUSTOM_THEME_BACKGROUND.Paper } }],
      // Partial or padded objects.
      [{ customTheme: { base: 'light', accent: 'ocean', background: 'paper' } }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, userId: 'x' } }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, style: 'color: red' } }],
    ])('rejects %j with 400 and changes nothing', async (body) => {
      const a = asUser(t.app, users.owner);
      await a.patch(USER_SETTINGS_ENDPOINT).send(body).expect(400);
      expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
        trashRetentionDays: 30,
        folderColours: true,
        pauseHistory: false,
        ...APPEARANCE_DEFAULTS,
      });
    });

    it('is isolated: one user’s theme never reaches another', async () => {
      const a = asUser(t.app, users.owner);
      const b = asUser(t.app, users.intruder);
      await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({
          theme: THEME_PREFERENCE.Custom,
          customTheme: dark,
          motion: MOTION_PREFERENCE.Reduced,
        })
        .expect(200);
      expect((await b.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
        trashRetentionDays: 30,
        folderColours: true,
        pauseHistory: false,
        ...APPEARANCE_DEFAULTS,
      });
      await b.patch(USER_SETTINGS_ENDPOINT).send({ theme: THEME_PREFERENCE.Dark }).expect(200);
      const owner = (await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse;
      expect(owner.theme).toBe(THEME_PREFERENCE.Custom);
      expect(owner.customTheme).toEqual(dark);
      expect(owner.motion).toBe(MOTION_PREFERENCE.Reduced);
    });

    it('is enforced by the database CHECKs', async () => {
      const id = users.owner.userId;
      for (const data of [
        { theme: 'sepia' },
        { motion: 'none' },
        { customThemeAccent: 'red' },
        { customThemeCorners: 'pill' },
        { customThemeBackground: 'black' },
        { customThemeBase: 'dark' },
      ]) {
        await expect(t.db.prisma.user.update({ where: { id }, data })).rejects.toThrow();
      }
    });
  });
});
