import {
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUND,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  CUSTOM_THEME_DEFAULT,
  type CustomTheme,
  type FolderResponse,
  APP_FONT,
  DATE_FORMAT,
  INTERFACE_LANGUAGE,
  LANGUAGE_SETTINGS_DEFAULT,
  TIME_FORMAT,
  WEEK_START,
  CARD_PREVIEW,
  DENSITY,
  LAYOUT_SETTINGS_DEFAULT,
  TEXT_SIZE,
  LIBRARY_SETTINGS_DEFAULT,
  LIBRARY_SORT,
  LIBRARY_VIEW,
  LINK_OPEN_TARGET,
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
  appearanceSaved: false,
  ...LAYOUT_SETTINGS_DEFAULT,
  // Not the appearance, but every whole-body expectation needs them too (#274).
  ...LANGUAGE_SETTINGS_DEFAULT,
  languageSaved: false,
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
      ...LIBRARY_SETTINGS_DEFAULT,
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
      ...LIBRARY_SETTINGS_DEFAULT,
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
      ...LIBRARY_SETTINGS_DEFAULT,
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
      .send({ folderColours: false, pauseHistory: false })
      .expect(200);
    expect(off.body).toEqual({
      trashRetentionDays: 30,
      folderColours: false,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
      ...LIBRARY_SETTINGS_DEFAULT,
    });
    const day = await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7 }).expect(200);
    expect(day.body).toEqual({
      trashRetentionDays: 7,
      folderColours: false,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
      ...LIBRARY_SETTINGS_DEFAULT,
    });
    expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual(day.body);
    const other = asUser(t.app, users.intruder);
    expect((await other.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
      ...LIBRARY_SETTINGS_DEFAULT,
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
      ...LIBRARY_SETTINGS_DEFAULT,
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
      ...LIBRARY_SETTINGS_DEFAULT,
    });
    expect(
      (await demo.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7 }).expect(200)).body,
    ).toEqual({
      trashRetentionDays: 7,
      folderColours: true,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
      ...LIBRARY_SETTINGS_DEFAULT,
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

    it('marks the appearance saved on its first write only, not on other settings', async () => {
      const a = asUser(t.app, users.owner);
      const other = await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ trashRetentionDays: 7 })
        .expect(200);
      expect((other.body as UserSettingsResponse).appearanceSaved).toBe(false);
      const motion = await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ motion: MOTION_PREFERENCE.Full })
        .expect(200);
      expect((motion.body as UserSettingsResponse).appearanceSaved).toBe(true);
      const saved = await t.db.prisma.user.findUniqueOrThrow({ where: { id: users.owner.userId } });
      expect(saved.appearanceSavedAt).toBeInstanceOf(Date);
      // Saving the defaults explicitly still counts as chosen.
      const b = asUser(t.app, users.intruder);
      const chosen = await b
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ theme: THEME_PREFERENCE.System })
        .expect(200);
      expect((chosen.body as UserSettingsResponse).appearanceSaved).toBe(true);
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
        appearanceSaved: true,
        ...LAYOUT_SETTINGS_DEFAULT,
        ...LIBRARY_SETTINGS_DEFAULT,
        ...LANGUAGE_SETTINGS_DEFAULT,
        languageSaved: false,
      });
      // Choosing another theme keeps the custom one for later.
      const light = await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ theme: THEME_PREFERENCE.Light })
        .expect(200);
      expect((light.body as UserSettingsResponse).customTheme).toEqual(dark);
    });

    it('saves an own accent colour (#315) and the database keeps only #rrggbb', async () => {
      const a = asUser(t.app, users.owner);
      const own: CustomTheme = { ...CUSTOM_THEME_DEFAULT, accent: '#2e6a99' };
      const res = await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ theme: THEME_PREFERENCE.Custom, customTheme: own })
        .expect(200);
      expect((res.body as UserSettingsResponse).customTheme).toEqual(own);
      expect(
        ((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse)
          .customTheme,
      ).toEqual(own);
      // Another user's settings stay untouched.
      const b = asUser(t.app, users.intruder);
      expect(
        ((await b.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse)
          .customTheme,
      ).toEqual(CUSTOM_THEME_DEFAULT);
      await expect(
        t.db.prisma.user.update({
          where: { id: users.owner.userId },
          data: { customThemeAccent: 'red' },
        }),
      ).rejects.toThrow();
      await expect(
        t.db.prisma.user.update({
          where: { id: users.owner.userId },
          data: { customThemeAccent: '#ABCDEF' },
        }),
      ).rejects.toThrow();
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
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, accent: '#FF0000' } }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, accent: '#ff00' } }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, accent: 'ff0000' } }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, accent: '#ff0000; color: red' } }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, accent: 'rgb(255 0 0)' } }],
      [{ customTheme: { ...CUSTOM_THEME_DEFAULT, accent: 7 } }],
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
        ...LIBRARY_SETTINGS_DEFAULT,
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
        ...LIBRARY_SETTINGS_DEFAULT,
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

  describe('library (#284)', () => {
    const library = async (userId: string) =>
      t.db.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const folder = async (agent: ReturnType<typeof asUser>, name: string): Promise<string> =>
      ((await agent.post('/api/folders').send({ name }).expect(201)).body as FolderResponse).id;

    it('saves every viewing and saving choice and reads it back', async () => {
      const a = asUser(t.app, users.owner);
      const id = await folder(a, 'Reading');
      const change = {
        defaultView: LIBRARY_VIEW.List,
        defaultSort: LIBRARY_SORT.Title,
        openLinksIn: LINK_OPEN_TARGET.SameTab,
        showFolderCounts: false,
        newLinksFolderId: id,
        fetchPreviews: false,
      };
      const res = await a.patch(USER_SETTINGS_ENDPOINT).send(change).expect(200);
      expect(res.body).toEqual({
        trashRetentionDays: 30,
        folderColours: true,
        pauseHistory: false,
        ...APPEARANCE_DEFAULTS,
        ...change,
      });
      expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual(res.body);
      // Library choices are not the appearance.
      expect((res.body as UserSettingsResponse).appearanceSaved).toBe(false);
    });

    it.each(Object.values(LIBRARY_SORT))('saves the sort %s', async (defaultSort) => {
      const a = asUser(t.app, users.owner);
      const res = await a.patch(USER_SETTINGS_ENDPOINT).send({ defaultSort }).expect(200);
      expect((res.body as UserSettingsResponse).defaultSort).toBe(defaultSort);
    });

    it('goes back to Unsorted with null', async () => {
      const a = asUser(t.app, users.owner);
      const id = await folder(a, 'Reading');
      await a.patch(USER_SETTINGS_ENDPOINT).send({ newLinksFolderId: id }).expect(200);
      const res = await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ newLinksFolderId: null })
        .expect(200);
      expect((res.body as UserSettingsResponse).newLinksFolderId).toBeNull();
      expect((await library(users.owner.userId)).newLinksFolderId).toBeNull();
    });

    it('refuses another user’s, a missing or a trashed folder with 404 and saves nothing', async () => {
      const a = asUser(t.app, users.owner);
      const b = asUser(t.app, users.intruder);
      const foreign = await folder(b, 'Theirs');
      const trashed = await folder(a, 'Old');
      await a.delete(`/api/folders/${trashed}?mode=move-to-unsorted`).expect(204);
      for (const id of [foreign, trashed, '0190a000-0000-7000-8000-000000000001']) {
        await a
          .patch(USER_SETTINGS_ENDPOINT)
          .send({ newLinksFolderId: id, fetchPreviews: false })
          .expect(404);
      }
      const row = await library(users.owner.userId);
      expect(row.newLinksFolderId).toBeNull();
      expect(row.fetchPreviews).toBe(true);
    });

    it('reads as Unsorted once the folder goes to Trash or is deleted for good', async () => {
      const a = asUser(t.app, users.owner);
      const id = await folder(a, 'Reading');
      await a.patch(USER_SETTINGS_ENDPOINT).send({ newLinksFolderId: id }).expect(200);
      await a.delete(`/api/folders/${id}?mode=move-to-unsorted`).expect(204);
      expect(
        ((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse)
          .newLinksFolderId,
      ).toBeNull();
      await t.db.prisma.folder.deleteMany({ where: { id } });
      expect(
        ((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse)
          .newLinksFolderId,
      ).toBeNull();
    });

    it.each([
      [{ defaultView: 'grid' }],
      [{ defaultView: null }],
      [{ defaultSort: 'random' }],
      [{ defaultSort: 1 }],
      [{ openLinksIn: '_blank' }],
      [{ openLinksIn: true }],
      [{ showFolderCounts: 'false' }],
      [{ showFolderCounts: null }],
      [{ fetchPreviews: 'yes' }],
      // Retired in #315 (always on / always stripped): unknown fields now.
      [{ warnDuplicates: false }],
      [{ keepQuery: true }],
      [{ newLinksFolderId: 'unsorted' }],
      [{ newLinksFolderId: 7 }],
      [{ newLinksFolderId: '' }],
      [{ newLinksFolderId: ['0190a000-0000-7000-8000-000000000001'] }],
      [{ trackingParams: ['ref'] }],
    ])('rejects %j with 400 and changes nothing', async (body) => {
      const a = asUser(t.app, users.owner);
      await a.patch(USER_SETTINGS_ENDPOINT).send(body).expect(400);
      expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
        trashRetentionDays: 30,
        folderColours: true,
        pauseHistory: false,
        ...APPEARANCE_DEFAULTS,
        ...LIBRARY_SETTINGS_DEFAULT,
      });
    });

    it('is isolated: one user’s library choices never reach another', async () => {
      const a = asUser(t.app, users.owner);
      const b = asUser(t.app, users.intruder);
      const id = await folder(a, 'Reading');
      await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ defaultView: LIBRARY_VIEW.List, newLinksFolderId: id, fetchPreviews: false })
        .expect(200);
      const other = (await b.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse;
      expect(other.defaultView).toBe(LIBRARY_VIEW.Cards);
      expect(other.newLinksFolderId).toBeNull();
      expect(other.fetchPreviews).toBe(true);
      // Nor can B point at A's folder through a hand-written row: it reads as Unsorted.
      await t.db.prisma.user.update({
        where: { id: users.intruder.userId },
        data: { newLinksFolderId: id },
      });
      expect(
        ((await b.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse)
          .newLinksFolderId,
      ).toBeNull();
    });

    it('is enforced by the database CHECKs', async () => {
      const id = users.owner.userId;
      for (const data of [
        { defaultView: 'grid' },
        { defaultSort: 'random' },
        { openLinksIn: 'x' },
      ]) {
        await expect(t.db.prisma.user.update({ where: { id }, data })).rejects.toThrow();
      }
    });
  });

  describe('appearance layout (#285)', () => {
    const layout = {
      textSize: TEXT_SIZE.XL,
      font: APP_FONT.Readable,
      density: DENSITY.Compact,
      cardPreview: CARD_PREVIEW.Off,
      cardSite: false,
      cardNotes: false,
      cardTags: false,
    };

    it('saves text size, font, density and the card options, and marks the appearance saved', async () => {
      const a = asUser(t.app, users.owner);
      const res = await a.patch(USER_SETTINGS_ENDPOINT).send(layout).expect(200);
      expect(res.body).toEqual({
        trashRetentionDays: 30,
        folderColours: true,
        pauseHistory: false,
        ...APPEARANCE_DEFAULTS,
        ...LIBRARY_SETTINGS_DEFAULT,
        ...layout,
        appearanceSaved: true,
      });
      expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual(res.body);
    });

    it('changes only the layout fields sent', async () => {
      const a = asUser(t.app, users.owner);
      await a.patch(USER_SETTINGS_ENDPOINT).send({ density: DENSITY.Compact }).expect(200);
      const res = await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ cardPreview: CARD_PREVIEW.Small })
        .expect(200);
      const body = res.body as UserSettingsResponse;
      expect(body.density).toBe(DENSITY.Compact);
      expect(body.cardPreview).toBe(CARD_PREVIEW.Small);
      expect(body.textSize).toBe(TEXT_SIZE.M);
      expect(body.cardTags).toBe(true);
    });

    it.each(Object.values(TEXT_SIZE))('saves the text size %s', async (textSize) => {
      const a = asUser(t.app, users.owner);
      const res = await a.patch(USER_SETTINGS_ENDPOINT).send({ textSize }).expect(200);
      expect((res.body as UserSettingsResponse).textSize).toBe(textSize);
    });

    it.each([
      [{ textSize: '125%' }],
      [{ textSize: null }],
      [{ font: 'Atkinson Hyperlegible' }],
      [{ font: 1 }],
      [{ density: 'cozy' }],
      [{ cardPreview: 'medium' }],
      [{ cardPreview: false }],
      [{ cardSite: 'off' }],
      [{ cardNotes: null }],
      [{ cardTags: 0 }],
      [{ fontSize: 20 }],
    ])('rejects %j with 400 and changes nothing', async (body) => {
      const a = asUser(t.app, users.owner);
      await a.patch(USER_SETTINGS_ENDPOINT).send(body).expect(400);
      expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
        trashRetentionDays: 30,
        folderColours: true,
        pauseHistory: false,
        ...APPEARANCE_DEFAULTS,
        ...LIBRARY_SETTINGS_DEFAULT,
      });
    });

    it('is isolated: one user’s layout never reaches another', async () => {
      const a = asUser(t.app, users.owner);
      const b = asUser(t.app, users.intruder);
      await a.patch(USER_SETTINGS_ENDPOINT).send(layout).expect(200);
      const other = (await b.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse;
      expect(other).toMatchObject({ ...LAYOUT_SETTINGS_DEFAULT, appearanceSaved: false });
      await b.patch(USER_SETTINGS_ENDPOINT).send({ textSize: TEXT_SIZE.S }).expect(200);
      const owner = (await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse;
      expect(owner.textSize).toBe(TEXT_SIZE.XL);
    });

    it('is enforced by the database CHECKs', async () => {
      const id = users.owner.userId;
      for (const data of [
        { textSize: 'xxl' },
        { font: 'comic' },
        { density: 'airy' },
        { cardPreview: 'giant' },
      ]) {
        await expect(t.db.prisma.user.update({ where: { id }, data })).rejects.toThrow();
      }
    });
  });

  describe('language (#274)', () => {
    const language = {
      language: INTERFACE_LANGUAGE.Fr,
      dateFormat: DATE_FORMAT.Iso,
      timeFormat: TIME_FORMAT.H12,
      weekStart: WEEK_START.Sunday,
      spellcheck: false,
    };
    const defaults = {
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
      ...APPEARANCE_DEFAULTS,
      ...LIBRARY_SETTINGS_DEFAULT,
    };

    it('defaults to the browser language and keeps it unsaved', async () => {
      const res = await asUser(t.app, users.owner).get(USER_SETTINGS_ENDPOINT).expect(200);
      expect(res.body).toMatchObject({ ...LANGUAGE_SETTINGS_DEFAULT, languageSaved: false });
    });

    it('saves every language setting and marks them saved, not the appearance', async () => {
      const a = asUser(t.app, users.owner);
      const res = await a.patch(USER_SETTINGS_ENDPOINT).send(language).expect(200);
      expect(res.body).toEqual({ ...defaults, ...language, languageSaved: true });
      expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual(res.body);
    });

    it('changes only the language fields sent', async () => {
      const a = asUser(t.app, users.owner);
      await a.patch(USER_SETTINGS_ENDPOINT).send({ language: INTERFACE_LANGUAGE.De }).expect(200);
      const res = await a
        .patch(USER_SETTINGS_ENDPOINT)
        .send({ timeFormat: TIME_FORMAT.H24 })
        .expect(200);
      const body = res.body as UserSettingsResponse;
      expect(body.language).toBe(INTERFACE_LANGUAGE.De);
      expect(body.timeFormat).toBe(TIME_FORMAT.H24);
      expect(body.dateFormat).toBe(DATE_FORMAT.Default);
      expect(body.spellcheck).toBe(true);
      expect(body.languageSaved).toBe(true);
    });

    it('does not mark the language saved for other settings', async () => {
      const a = asUser(t.app, users.owner);
      const res = await a.patch(USER_SETTINGS_ENDPOINT).send({ folderColours: false }).expect(200);
      expect((res.body as UserSettingsResponse).languageSaved).toBe(false);
    });

    it.each(Object.values(INTERFACE_LANGUAGE))('saves the language %s', async (value) => {
      const a = asUser(t.app, users.owner);
      const res = await a.patch(USER_SETTINGS_ENDPOINT).send({ language: value }).expect(200);
      expect((res.body as UserSettingsResponse).language).toBe(value);
    });

    it.each(Object.values(DATE_FORMAT))('saves the date format %s', async (value) => {
      const a = asUser(t.app, users.owner);
      const res = await a.patch(USER_SETTINGS_ENDPOINT).send({ dateFormat: value }).expect(200);
      expect((res.body as UserSettingsResponse).dateFormat).toBe(value);
    });

    it.each([
      [{ language: 'uk' }],
      [{ language: 'EN' }],
      [{ language: 'fr-FR' }],
      [{ language: null }],
      [{ dateFormat: 'dd/MM/yyyy' }],
      [{ dateFormat: 1 }],
      [{ timeFormat: '24' }],
      [{ timeFormat: true }],
      [{ weekStart: 'saturday' }],
      [{ weekStart: null }],
      [{ spellcheck: 'on' }],
      [{ spellcheck: null }],
      [{ locale: 'fr' }],
    ])('rejects %j with 400 and changes nothing', async (body) => {
      const a = asUser(t.app, users.owner);
      await a.patch(USER_SETTINGS_ENDPOINT).send(body).expect(400);
      expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual(defaults);
    });

    it('needs a session', async () => {
      await anonymous(t.app).patch(USER_SETTINGS_ENDPOINT).send(language).expect(401);
    });

    it('is isolated: one user’s language never reaches another', async () => {
      const a = asUser(t.app, users.owner);
      const b = asUser(t.app, users.intruder);
      await a.patch(USER_SETTINGS_ENDPOINT).send(language).expect(200);
      const other = (await b.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse;
      expect(other).toMatchObject({ ...LANGUAGE_SETTINGS_DEFAULT, languageSaved: false });
      await b.patch(USER_SETTINGS_ENDPOINT).send({ language: INTERFACE_LANGUAGE.It }).expect(200);
      const owner = (await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse;
      expect(owner.language).toBe(INTERFACE_LANGUAGE.Fr);
    });

    it('is enforced by the database CHECKs', async () => {
      const id = users.owner.userId;
      for (const data of [
        { language: 'uk' },
        { dateFormat: 'yyyy' },
        { timeFormat: 'h13' },
        { weekStart: 'saturday' },
      ]) {
        await expect(t.db.prisma.user.update({ where: { id }, data })).rejects.toThrow();
      }
    });
  });
});
