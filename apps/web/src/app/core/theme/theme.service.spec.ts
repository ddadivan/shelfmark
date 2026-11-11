import { LAYOUT_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { TestBed } from '@angular/core/testing';
import {
  CUSTOM_ACCENT_OWN,
  CUSTOM_THEME_ATTRIBUTE,
  MOTION_ATTRIBUTE,
  MOTION_REDUCED,
  ReducedMotion,
  THEME,
  THEME_ATTRIBUTE,
  THEME_CUSTOM,
  contrastRatio,
  nearestAccessibleAccent,
} from '@shelfmark/ui';
import { CUSTOM_THEME_STORAGE_KEY } from './models/custom-theme-storage-key.const';
import { MOTION_STORAGE_KEY } from './models/motion-storage-key.const';
import {
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUND,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  CUSTOM_THEME_DEFAULT,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  type CustomTheme,
} from '@shelfmark/contracts';
import { THEME_STORAGE_KEY } from './models/theme-storage-key.const';
import { ThemeService } from './theme.service';

type ChangeListener = (event: MediaQueryListEvent) => void;

interface SystemScheme {
  emit: (dark: boolean) => void;
  listenerCount: () => number;
}

const originalMatchMedia = window.matchMedia;

function stubSystemScheme(dark: boolean): SystemScheme {
  const listeners = new Set<ChangeListener>();
  const query = {
    matches: dark,
    addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: ChangeListener) => listeners.delete(listener),
  };
  window.matchMedia = (() => query) as unknown as typeof window.matchMedia;
  return {
    emit: (value) => listeners.forEach((l) => l({ matches: value } as MediaQueryListEvent)),
    listenerCount: () => listeners.size,
  };
}

function createService(): ThemeService {
  const service = TestBed.inject(ThemeService);
  service.init();
  TestBed.tick();
  return service;
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('defaults to the system preference', () => {
    stubSystemScheme(false);
    expect(TestBed.inject(ThemeService).preference()).toBe(THEME_PREFERENCE.System);
  });

  it('resolves system to dark when the OS prefers dark', () => {
    stubSystemScheme(true);
    const service = createService();

    expect(service.resolved()).toBe(THEME.Dark);
  });

  it('resolves system to light when the OS prefers light', () => {
    stubSystemScheme(false);
    const service = createService();

    expect(service.resolved()).toBe(THEME.Light);
  });

  it.each([THEME.Light, THEME.Dark])('explicit %s overrides the system scheme', (theme) => {
    stubSystemScheme(theme === THEME.Light);
    const service = createService();
    service.setPreference(theme);

    expect(service.resolved()).toBe(theme);
  });

  it('persists the preference to localStorage under the storage key', () => {
    stubSystemScheme(false);
    const service = createService();
    service.setPreference(THEME_PREFERENCE.Dark);

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME.Dark);
  });

  it('keeps the persisted storage key stable', () => {
    // Renaming it would drop every saved user preference.
    // eslint-disable-next-line no-restricted-syntax -- pinned on purpose (ADR 0024)
    expect(THEME_STORAGE_KEY).toBe('sm-theme');
  });

  it.each(Object.values(THEME_PREFERENCE))('restores stored %s on init', (stored) => {
    stubSystemScheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, String(stored));
    const service = createService();

    expect(service.preference()).toBe(stored);
  });

  it('falls back to system when the stored value is invalid', () => {
    stubSystemScheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    const service = createService();

    expect(service.preference()).toBe(THEME_PREFERENCE.System);
  });

  it('does not crash when reading localStorage throws', () => {
    stubSystemScheme(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    const service = createService();

    expect(service.preference()).toBe(THEME_PREFERENCE.System);
  });

  it('keeps the choice for the session when writing localStorage throws', () => {
    stubSystemScheme(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const service = createService();

    expect(() => service.setPreference(THEME_PREFERENCE.Dark)).not.toThrow();
    expect(service.preference()).toBe(THEME.Dark);
    expect(service.resolved()).toBe(THEME.Dark);
  });

  it('updates the resolved theme on system change while preference is system', () => {
    const system = stubSystemScheme(false);
    const service = createService();

    system.emit(true);
    TestBed.tick();

    expect(service.resolved()).toBe(THEME.Dark);
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(THEME.Dark);
  });

  it('ignores system changes when an explicit preference is set', () => {
    const system = stubSystemScheme(false);
    const service = createService();
    service.setPreference(THEME_PREFERENCE.Light);

    system.emit(true);
    TestBed.tick();

    expect(service.resolved()).toBe(THEME.Light);
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(THEME.Light);
  });

  it('writes data-theme and color-scheme on the root element', () => {
    stubSystemScheme(true);
    const service = createService();

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(THEME.Dark);
    expect(document.documentElement.style.colorScheme).toBe(THEME.Dark);

    service.setPreference(THEME_PREFERENCE.Light);
    TestBed.tick();

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(THEME.Light);
    expect(document.documentElement.style.colorScheme).toBe(THEME.Light);
  });

  it('stops listening to the system scheme when destroyed', () => {
    const system = stubSystemScheme(false);
    createService();
    expect(system.listenerCount()).toBeGreaterThan(0);

    TestBed.resetTestingModule();

    expect(system.listenerCount()).toBe(0);
  });

  describe('Custom theme and Animations (#273)', () => {
    const root = document.documentElement;
    const dark: CustomTheme = {
      base: CUSTOM_THEME_BASE.Dark,
      accent: CUSTOM_THEME_ACCENT.Rose,
      background: CUSTOM_THEME_BACKGROUND.Ink,
      corners: CUSTOM_THEME_CORNERS.Square,
    };
    const customAttributes = () =>
      Object.values(CUSTOM_THEME_ATTRIBUTE).map((name) => root.getAttribute(name));

    afterEach(() => {
      for (const name of [...Object.values(CUSTOM_THEME_ATTRIBUTE), MOTION_ATTRIBUTE]) {
        root.removeAttribute(name);
      }
    });

    it('writes data-theme=custom, the custom attributes and the base colour scheme', () => {
      stubSystemScheme(false);
      const service = createService();
      service.setCustomTheme(dark);
      service.setPreference(THEME_PREFERENCE.Custom);
      TestBed.tick();

      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe(THEME_CUSTOM);
      expect(customAttributes()).toEqual(['dark', 'rose', 'ink', 'square']);
      expect(root.style.colorScheme).toBe(THEME.Dark);
      expect(service.resolved()).toBe(THEME.Dark);
    });

    it('removes the custom attributes for a fixed theme but keeps the custom theme', () => {
      stubSystemScheme(false);
      const service = createService();
      service.apply({
        theme: THEME_PREFERENCE.Custom,
        customTheme: dark,
        motion: MOTION_PREFERENCE.System,
        ...LAYOUT_SETTINGS_DEFAULT,
      });
      TestBed.tick();
      service.setPreference(THEME_PREFERENCE.Light);
      TestBed.tick();

      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe(THEME.Light);
      expect(customAttributes()).toEqual([null, null, null, null]);
      expect(service.customTheme()).toEqual(dark);
    });

    it('draws an own accent colour through custom properties in its nearest AA shade (#315)', () => {
      stubSystemScheme(false);
      const service = createService();
      service.setCustomTheme({
        ...dark,
        base: CUSTOM_THEME_BASE.Light,
        background: CUSTOM_THEME_BACKGROUND.Paper,
        accent: '#f5d0e0',
      });
      service.setPreference(THEME_PREFERENCE.Custom);
      TestBed.tick();

      expect(root.getAttribute(CUSTOM_THEME_ATTRIBUTE.Accent)).toBe(CUSTOM_ACCENT_OWN);
      const accent = root.style.getPropertyValue('--accent');
      expect(accent).toBe(nearestAccessibleAccent('#f5d0e0', 'light', 'paper'));
      expect(contrastRatio(accent, '#f7f4ee')).toBeGreaterThanOrEqual(4.5);
      expect(root.style.getPropertyValue('--accent-bg')).not.toBe('');
      expect(root.style.getPropertyValue('--accent-text')).not.toBe('');
      expect(root.style.getPropertyValue('--focus-ring')).toBe(accent);

      // A curated accent or a fixed theme drops them again.
      service.setCustomTheme(dark);
      TestBed.tick();
      expect(root.style.getPropertyValue('--accent')).toBe('');
      service.setCustomTheme({ ...dark, accent: '#2e6a99' });
      service.setPreference(THEME_PREFERENCE.Light);
      TestBed.tick();
      expect(root.style.getPropertyValue('--accent')).toBe('');
      expect(root.getAttribute(CUSTOM_THEME_ATTRIBUTE.Accent)).toBeNull();
    });

    it('sets data-motion and ReducedMotion for the Animations setting', () => {
      stubSystemScheme(false);
      const service = createService();
      const motion = TestBed.inject(ReducedMotion);

      service.setMotion(MOTION_PREFERENCE.Reduced);
      TestBed.tick();
      expect(root.getAttribute(MOTION_ATTRIBUTE)).toBe(MOTION_REDUCED);
      expect(motion.reduced()).toBe(true);

      service.setMotion(MOTION_PREFERENCE.Full);
      TestBed.tick();
      expect(root.getAttribute(MOTION_ATTRIBUTE)).toBe(MOTION_PREFERENCE.Full);
      expect(motion.reduced()).toBe(false);

      service.setMotion(MOTION_PREFERENCE.System);
      TestBed.tick();
      expect(root.hasAttribute(MOTION_ATTRIBUTE)).toBe(false);
    });

    it('persists and restores the whole appearance for the first paint', () => {
      stubSystemScheme(false);
      createService().apply({
        theme: THEME_PREFERENCE.Custom,
        customTheme: dark,
        motion: MOTION_PREFERENCE.Reduced,
        ...LAYOUT_SETTINGS_DEFAULT,
      });
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME_PREFERENCE.Custom);
      expect(JSON.parse(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY) ?? 'null')).toEqual(dark);
      expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe(MOTION_PREFERENCE.Reduced);

      TestBed.resetTestingModule();
      const restored = createService();
      expect(restored.appearance()).toEqual({
        theme: THEME_PREFERENCE.Custom,
        customTheme: dark,
        motion: MOTION_PREFERENCE.Reduced,
        ...LAYOUT_SETTINGS_DEFAULT,
      });
      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe(THEME_CUSTOM);
    });

    it.each([
      ['not json', '{'],
      ['a colour that is not #rrggbb', JSON.stringify({ ...CUSTOM_THEME_DEFAULT, accent: 'red' })],
      ['an upper-case colour', JSON.stringify({ ...CUSTOM_THEME_DEFAULT, accent: '#FF0000' })],
      [
        'a background of the other base',
        JSON.stringify({ ...CUSTOM_THEME_DEFAULT, background: 'black' }),
      ],
    ])('ignores a stored custom theme that is %s', (_, stored) => {
      stubSystemScheme(false);
      localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, stored);
      localStorage.setItem(MOTION_STORAGE_KEY, 'wild');
      const service = createService();
      expect(service.customTheme()).toEqual(CUSTOM_THEME_DEFAULT);
      expect(service.motion()).toBe(MOTION_PREFERENCE.System);
    });

    it('follows a change made in another tab', () => {
      stubSystemScheme(false);
      const service = createService();
      localStorage.setItem(THEME_STORAGE_KEY, THEME_PREFERENCE.Custom);
      localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(dark));
      window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_THEME_STORAGE_KEY }));
      TestBed.tick();

      expect(service.preference()).toBe(THEME_PREFERENCE.Custom);
      expect(service.customTheme()).toEqual(dark);
      expect(root.getAttribute(CUSTOM_THEME_ATTRIBUTE.Accent)).toBe('rose');

      localStorage.setItem(MOTION_STORAGE_KEY, MOTION_PREFERENCE.Reduced);
      window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
      expect(service.motion()).toBe(MOTION_PREFERENCE.System);
      window.dispatchEvent(new StorageEvent('storage', { key: MOTION_STORAGE_KEY }));
      expect(service.motion()).toBe(MOTION_PREFERENCE.Reduced);
    });

    it('tells whether this browser holds a valid appearance of its own', () => {
      stubSystemScheme(false);
      const service = createService();
      expect(service.hasStoredAppearance()).toBe(false);

      localStorage.setItem(THEME_STORAGE_KEY, 'purple');
      localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, '{');
      expect(service.hasStoredAppearance()).toBe(false);

      localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(dark));
      expect(service.hasStoredAppearance()).toBe(true);
      localStorage.clear();
      localStorage.setItem(MOTION_STORAGE_KEY, MOTION_PREFERENCE.Reduced);
      expect(service.hasStoredAppearance()).toBe(true);
      localStorage.clear();
      localStorage.setItem(THEME_STORAGE_KEY, THEME_PREFERENCE.Dark);
      expect(service.hasStoredAppearance()).toBe(true);
    });

    it('stops following other tabs when destroyed', () => {
      stubSystemScheme(false);
      const remove = vi.spyOn(window, 'removeEventListener');
      createService();
      TestBed.resetTestingModule();
      expect(remove.mock.calls.some(([type]) => type === 'storage')).toBe(true);
    });
  });
});
