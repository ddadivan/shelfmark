import { TestBed } from '@angular/core/testing';
import {
  APP_FONT,
  CARD_PREVIEW,
  DENSITY,
  FOLDER_HIGHLIGHT,
  LAYOUT_SETTINGS_DEFAULT,
  TEXT_SIZE,
  type LayoutSettings,
} from '@shelfmark/contracts';
import { LAYOUT_ATTRIBUTE, LAYOUT_OFF } from '@shelfmark/ui';
import { LAYOUT_STORAGE_KEY } from './models/layout-storage-key.const';
import { ThemeService } from './theme.service';

const ALL: LayoutSettings = {
  textSize: TEXT_SIZE.XL,
  font: APP_FONT.Readable,
  density: DENSITY.Compact,
  cardPreview: CARD_PREVIEW.Off,
  cardSite: false,
  cardNotes: false,
  cardTags: false,
  folderHighlight: FOLDER_HIGHLIGHT.Background,
};

function createService(): ThemeService {
  const service = TestBed.inject(ThemeService);
  service.init();
  TestBed.tick();
  return service;
}

function attributes(): (string | null)[] {
  const root = document.documentElement;
  return Object.values(LAYOUT_ATTRIBUTE).map((name) => root.getAttribute(name));
}

describe('ThemeService text, layout and card options (#285)', () => {
  beforeEach(() => {
    localStorage.clear();
    for (const name of Object.values(LAYOUT_ATTRIBUTE)) {
      document.documentElement.removeAttribute(name);
    }
  });

  it('sets no layout attribute for the defaults', () => {
    const service = createService();
    expect(service.layout()).toEqual(LAYOUT_SETTINGS_DEFAULT);
    expect(attributes()).toEqual([null, null, null, null, null, null, null, null]);
  });

  it('writes every chosen option to <html> and removes it again for the default', () => {
    const service = createService();
    service.setLayout(ALL);
    TestBed.tick();
    expect(attributes()).toEqual([
      TEXT_SIZE.XL,
      APP_FONT.Readable,
      DENSITY.Compact,
      CARD_PREVIEW.Off,
      LAYOUT_OFF,
      LAYOUT_OFF,
      LAYOUT_OFF,
      FOLDER_HIGHLIGHT.Background,
    ]);

    service.setLayout({ ...ALL, textSize: TEXT_SIZE.S, font: APP_FONT.System });
    TestBed.tick();
    expect(document.documentElement.getAttribute(LAYOUT_ATTRIBUTE.TextSize)).toBe(TEXT_SIZE.S);
    expect(document.documentElement.getAttribute(LAYOUT_ATTRIBUTE.Font)).toBe(APP_FONT.System);

    service.setLayout(LAYOUT_SETTINGS_DEFAULT);
    TestBed.tick();
    expect(attributes()).toEqual([null, null, null, null, null, null, null, null]);
  });

  it('is part of the appearance and of apply()', () => {
    const service = createService();
    service.apply({ ...service.appearance(), density: DENSITY.Compact });
    TestBed.tick();
    expect(service.appearance().density).toBe(DENSITY.Compact);
    expect(document.documentElement.getAttribute(LAYOUT_ATTRIBUTE.Density)).toBe(DENSITY.Compact);
  });

  it('remembers the layout for the first paint, whole and without extra keys', () => {
    createService().setLayout({ ...ALL, extra: 'x' } as LayoutSettings);
    expect(JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) ?? 'null')).toEqual(ALL);

    TestBed.resetTestingModule();
    const restored = createService();
    expect(restored.layout()).toEqual(ALL);
    expect(document.documentElement.getAttribute(LAYOUT_ATTRIBUTE.CardPreview)).toBe(
      CARD_PREVIEW.Off,
    );
    expect(restored.hasStoredAppearance()).toBe(true);
  });

  it('ignores a broken or partial stored layout', () => {
    for (const stored of [
      '{',
      '[]',
      JSON.stringify({ textSize: 'xl' }),
      JSON.stringify({ ...ALL, font: 'comic' }),
    ]) {
      localStorage.setItem(LAYOUT_STORAGE_KEY, stored);
      TestBed.resetTestingModule();
      const service = createService();
      expect(service.layout()).toEqual(LAYOUT_SETTINGS_DEFAULT);
      expect(service.hasStoredAppearance()).toBe(false);
    }
  });

  it('keeps a layout stored before the folder highlight existed, with the default stripe (#418)', () => {
    const older: Partial<LayoutSettings> = { ...ALL };
    delete older.folderHighlight;
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(older));
    const service = createService();
    expect(service.layout()).toEqual({ ...ALL, folderHighlight: FOLDER_HIGHLIGHT.Stripe });
    expect(document.documentElement.hasAttribute(LAYOUT_ATTRIBUTE.FolderHighlight)).toBe(false);
    expect(service.hasStoredAppearance()).toBe(true);
  });

  it('sets the folder highlight attribute for off and background only (#418)', () => {
    const service = createService();
    service.setLayout({ ...LAYOUT_SETTINGS_DEFAULT, folderHighlight: FOLDER_HIGHLIGHT.Off });
    TestBed.tick();
    expect(document.documentElement.getAttribute(LAYOUT_ATTRIBUTE.FolderHighlight)).toBe('off');
    service.setLayout({ ...LAYOUT_SETTINGS_DEFAULT, folderHighlight: FOLDER_HIGHLIGHT.Stripe });
    TestBed.tick();
    expect(document.documentElement.hasAttribute(LAYOUT_ATTRIBUTE.FolderHighlight)).toBe(false);
  });

  it('follows a layout changed in another tab', () => {
    const service = createService();
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(ALL));
    window.dispatchEvent(new StorageEvent('storage', { key: LAYOUT_STORAGE_KEY }));
    TestBed.tick();
    expect(service.layout()).toEqual(ALL);
  });
});
