import {
  CARD_PREVIEW,
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUND,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  CUSTOM_THEME_DEFAULT,
  DATE_FORMAT,
  DENSITY,
  FOLDER_DELETE_MODE,
  FOLDER_ERROR_MESSAGE,
  INTERFACE_LANGUAGE,
  LANGUAGE_SETTINGS_DEFAULT,
  LAYOUT_SETTINGS_DEFAULT,
  LIBRARY_SETTINGS_DEFAULT,
  LIBRARY_SORT,
  LIBRARY_VIEW,
  LINK_OPEN_TARGET,
  MOTION_PREFERENCE,
  TEXT_SIZE,
  THEME_PREFERENCE,
  TRASH_RETENTION_DEFAULT,
  USER_LIMIT,
  WEEK_START,
  type HexColour,
} from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';
const DAY_MS = 86_400_000;

/** The settings of an account that never saved any. */
const DEFAULT_SETTINGS = {
  ...LIBRARY_SETTINGS_DEFAULT,
  ...LAYOUT_SETTINGS_DEFAULT,
  ...LANGUAGE_SETTINGS_DEFAULT,
  trashRetentionDays: TRASH_RETENTION_DEFAULT,
  folderColours: true,
  pauseHistory: false,
  theme: THEME_PREFERENCE.System,
  customTheme: CUSTOM_THEME_DEFAULT,
  customColours: [],
  customEmoji: [],
  motion: MOTION_PREFERENCE.System,
  appearanceSaved: false,
  languageSaved: false,
};

export const SETTINGS_SCENARIOS: readonly ContractScenario[] = [
  scenario('settings', 'a new account has the default settings', async ({ settings }) => {
    expectEqual(await settings.get(), DEFAULT_SETTINGS);
  }),

  scenario('settings', 'an empty update changes nothing', async ({ settings }) => {
    expectEqual(await settings.update({}), DEFAULT_SETTINGS);
  }),

  scenario('settings', 'saves a change and keeps every other setting', async ({ settings }) => {
    const updated = await settings.update({ folderColours: false, pauseHistory: true });
    expectEqual(updated, { ...DEFAULT_SETTINGS, folderColours: false, pauseHistory: true });
    expectEqual(await settings.get(), updated);
  }),

  scenario(
    'settings',
    'keeps deleted items for the chosen days and shows it in the Trash',
    async ({ settings, trash, links }) => {
      expectEqual((await settings.update({ trashRetentionDays: 7 })).trashRetentionDays, 7);
      const link = await links.create({ url: 'https://a.example/', title: 'A' });
      await links.remove(link.id);
      const { items, retentionDays } = await trash.list();
      expectEqual(retentionDays, 7);
      expectEqual(Date.parse(items[0].expiresAt) - Date.parse(items[0].deletedAt), 7 * DAY_MS);
      await expectError(
        settings.update({ trashRetentionDays: 15 as never }),
        { status: 400 },
        'retention 15',
      );
    },
  ),

  scenario('settings', 'records no history while it is paused', async ({ settings, links }) => {
    const link = await links.create({ url: 'https://a.example/', title: 'A' });
    await settings.update({ pauseHistory: true });
    const paused = await links.open(link.id);
    expectEqual(paused.recorded, false);
    expectEqual(paused.lastOpenedAt, null);
    await settings.update({ pauseHistory: false });
    expectEqual((await links.open(link.id)).recorded, true);
  }),

  scenario(
    'settings',
    'saves own colours in order and replaces the list as a whole',
    async ({ settings }) => {
      const colours: HexColour[] = ['#aa00ff', '#00ff88', '#123456'];
      expectEqual((await settings.update({ customColours: colours })).customColours, colours);
      expectEqual((await settings.get()).customColours, colours);
      expectEqual((await settings.update({ customColours: ['#ffffff'] })).customColours, [
        '#ffffff',
      ]);
      expectEqual((await settings.update({ customColours: [] })).customColours, []);
    },
  ),

  scenario(
    'settings',
    'rejects own colours that are not #rrggbb or past the limit',
    async ({ settings }) => {
      await expectError(
        settings.update({ customColours: ['red' as HexColour] }),
        { status: 400 },
        'name',
      );
      await expectError(
        settings.update({ customColours: ['#fff' as HexColour] }),
        { status: 400 },
        'short hex',
      );
      await expectError(
        settings.update({ customColours: ['#AA00FF' as HexColour] }),
        { status: 400 },
        'upper case',
      );
      const tooMany = Array.from(
        { length: USER_LIMIT.CustomColoursMax + 1 },
        (_, index) => `#0000${String(10 + index)}` as HexColour,
      );
      await expectError(settings.update({ customColours: tooMany }), { status: 400 }, 'too many');
      expectEqual((await settings.get()).customColours, []);
    },
  ),

  scenario(
    'settings',
    'saves own emoji in order and replaces the list as a whole',
    async ({ settings }) => {
      const emoji = ['🦩', '🧑‍🍳', '🇺🇦'];
      expectEqual((await settings.update({ customEmoji: emoji })).customEmoji, emoji);
      expectEqual((await settings.get()).customEmoji, emoji);
      expectEqual((await settings.update({ customEmoji: ['❤️'] })).customEmoji, ['❤️']);
      expectEqual((await settings.update({ customEmoji: [] })).customEmoji, []);
    },
  ),

  scenario(
    'settings',
    'rejects own emoji that are not exactly one emoji or past the limit',
    async ({ settings }) => {
      await expectError(settings.update({ customEmoji: ['a'] }), { status: 400 }, 'letter');
      await expectError(settings.update({ customEmoji: ['🍕🍔'] }), { status: 400 }, 'two emoji');
      await expectError(settings.update({ customEmoji: ['🍕 '] }), { status: 400 }, 'space');
      await expectError(settings.update({ customEmoji: [''] }), { status: 400 }, 'empty');
      await expectError(
        settings.update({ customEmoji: ['🍕', '🍕'] }),
        { status: 400 },
        'duplicate',
      );
      const tooMany = Array.from({ length: USER_LIMIT.CustomEmojiMax + 1 }, (_, index) =>
        String.fromCodePoint(0x1f400 + index),
      );
      await expectError(settings.update({ customEmoji: tooMany }), { status: 400 }, 'too many');
      expectEqual((await settings.get()).customEmoji, []);
    },
  ),

  scenario('settings', 'saves the appearance and marks it as saved', async ({ settings }) => {
    const customTheme = {
      base: CUSTOM_THEME_BASE.Dark,
      accent: CUSTOM_THEME_ACCENT.Plum,
      background: CUSTOM_THEME_BACKGROUND.Ink,
      corners: CUSTOM_THEME_CORNERS.Square,
    };
    const updated = await settings.update({
      theme: THEME_PREFERENCE.Custom,
      customTheme,
      motion: MOTION_PREFERENCE.Reduced,
      textSize: TEXT_SIZE.L,
      density: DENSITY.Compact,
      cardPreview: CARD_PREVIEW.Off,
      cardNotes: false,
    });
    expectEqual(updated, {
      ...DEFAULT_SETTINGS,
      theme: THEME_PREFERENCE.Custom,
      customTheme,
      motion: MOTION_PREFERENCE.Reduced,
      textSize: TEXT_SIZE.L,
      density: DENSITY.Compact,
      cardPreview: CARD_PREVIEW.Off,
      cardNotes: false,
      appearanceSaved: true,
    });
    await expectError(
      settings.update({ theme: 'neon' as never }),
      { status: 400 },
      'unknown theme',
    );
  }),

  scenario(
    'settings',
    'saves the library choices and refuses a folder that is not live',
    async ({ settings, folders }) => {
      const folder = await folders.create({ name: 'Inbox' });
      const updated = await settings.update({
        defaultView: LIBRARY_VIEW.List,
        defaultSort: LIBRARY_SORT.Title,
        openLinksIn: LINK_OPEN_TARGET.SameTab,
        showFolderCounts: false,
        fetchPreviews: false,
        newLinksFolderId: folder.id,
      });
      expectEqual(updated, {
        ...DEFAULT_SETTINGS,
        defaultView: LIBRARY_VIEW.List,
        defaultSort: LIBRARY_SORT.Title,
        openLinksIn: LINK_OPEN_TARGET.SameTab,
        showFolderCounts: false,
        fetchPreviews: false,
        newLinksFolderId: folder.id,
      });
      await expectError(
        settings.update({ newLinksFolderId: MISSING_ID }),
        { status: 404, code: FOLDER_ERROR_MESSAGE.NotFound },
        'missing folder',
      );
      await folders.remove(folder.id, FOLDER_DELETE_MODE.MoveToUnsorted);
      expectEqual((await settings.get()).newLinksFolderId, null);
    },
  ),

  scenario(
    'settings',
    'saves the language choices and marks them as saved',
    async ({ settings }) => {
      const updated = await settings.update({
        language: INTERFACE_LANGUAGE.De,
        dateFormat: DATE_FORMAT.Iso,
        weekStart: WEEK_START.Monday,
      });
      expectEqual(updated, {
        ...DEFAULT_SETTINGS,
        language: INTERFACE_LANGUAGE.De,
        dateFormat: DATE_FORMAT.Iso,
        weekStart: WEEK_START.Monday,
        languageSaved: true,
      });
      await expectError(
        settings.update({ language: 'xx' as never }),
        { status: 400 },
        'unknown language',
      );
    },
  ),

  scenario(
    'settings',
    'rejects a field it does not know and a wrong type',
    async ({ settings }) => {
      await expectError(
        settings.update({ isAdmin: true } as never),
        { status: 400 },
        'unknown field',
      );
      await expectError(
        settings.update({ pauseHistory: 'yes' as never }),
        { status: 400 },
        'string for a flag',
      );
    },
  ),
];
