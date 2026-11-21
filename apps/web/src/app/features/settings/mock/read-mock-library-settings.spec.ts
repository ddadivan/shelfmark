import { LIBRARY_SETTINGS_DEFAULT, LINK_CLICK_ACTION, USER_LIMIT } from '@shelfmark/contracts';
import { MOCK_LIBRARY_SETTINGS_STORAGE_KEY } from '../models/mock-library-settings-storage-key.const';
import { readMockLibrarySettings, writeMockLibrarySettings } from './read-mock-library-settings';

function storageWith(value: unknown): Storage {
  localStorage.setItem(MOCK_LIBRARY_SETTINGS_STORAGE_KEY, JSON.stringify(value));
  return localStorage;
}

describe('readMockLibrarySettings', () => {
  afterEach(() => localStorage.removeItem(MOCK_LIBRARY_SETTINGS_STORAGE_KEY));

  it('is the default without storage or stored settings', () => {
    expect(readMockLibrarySettings(undefined)).toEqual(LIBRARY_SETTINGS_DEFAULT);
    expect(readMockLibrarySettings(localStorage)).toEqual(LIBRARY_SETTINGS_DEFAULT);
  });

  it('is the default for broken JSON or a stored value that is not an object', () => {
    localStorage.setItem(MOCK_LIBRARY_SETTINGS_STORAGE_KEY, '{nope');
    expect(readMockLibrarySettings(localStorage)).toEqual(LIBRARY_SETTINGS_DEFAULT);
    expect(readMockLibrarySettings(storageWith('text'))).toEqual(LIBRARY_SETTINGS_DEFAULT);
    expect(readMockLibrarySettings(storageWith(null))).toEqual(LIBRARY_SETTINGS_DEFAULT);
  });

  it('keeps a valid click action and the sites that open in a new tab', () => {
    const settings = readMockLibrarySettings(
      storageWith({
        clickAction: LINK_CLICK_ACTION.Preview,
        previewNewTabHosts: ['github.com', 'x.com'],
      }),
    );
    expect(settings.clickAction).toBe(LINK_CLICK_ACTION.Preview);
    expect(settings.previewNewTabHosts).toEqual(['github.com', 'x.com']);
  });

  it('falls back to the default click action for an unknown one', () => {
    expect(readMockLibrarySettings(storageWith({ clickAction: 'hover' })).clickAction).toBe(
      LIBRARY_SETTINGS_DEFAULT.clickAction,
    );
  });

  it('drops invalid and duplicate hosts', () => {
    const settings = readMockLibrarySettings(
      storageWith({
        previewNewTabHosts: [
          'github.com',
          'github.com',
          'GitHub.com',
          'https://x.com/a',
          7,
          'nodot',
        ],
      }),
    );
    expect(settings.previewNewTabHosts).toEqual(['github.com']);
  });

  it('keeps at most the limit of hosts', () => {
    const hosts = Array.from(
      { length: USER_LIMIT.PreviewNewTabHostsMax + 5 },
      (_, index) => `site${index}.example`,
    );
    expect(
      readMockLibrarySettings(storageWith({ previewNewTabHosts: hosts })).previewNewTabHosts,
    ).toHaveLength(USER_LIMIT.PreviewNewTabHostsMax);
  });

  it('uses the default hosts when the stored value is not a list', () => {
    expect(
      readMockLibrarySettings(storageWith({ previewNewTabHosts: 'github.com' })).previewNewTabHosts,
    ).toEqual(LIBRARY_SETTINGS_DEFAULT.previewNewTabHosts);
  });

  it('reads back what writeMockLibrarySettings stored', () => {
    const settings = {
      ...LIBRARY_SETTINGS_DEFAULT,
      clickAction: LINK_CLICK_ACTION.Preview,
      previewNewTabHosts: ['x.com'],
    };
    writeMockLibrarySettings(localStorage, settings);
    expect(readMockLibrarySettings(localStorage)).toEqual(settings);
  });

  it('writes nothing, and does not throw, without usable storage', () => {
    expect(() => writeMockLibrarySettings(undefined, LIBRARY_SETTINGS_DEFAULT)).not.toThrow();
    const blocked = {
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(() => writeMockLibrarySettings(blocked, LIBRARY_SETTINGS_DEFAULT)).not.toThrow();
  });
});
