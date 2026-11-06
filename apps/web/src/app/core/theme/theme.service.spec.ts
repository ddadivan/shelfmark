import { TestBed } from '@angular/core/testing';
import { THEME, THEME_ATTRIBUTE } from '@shelfmark/ui';
import { THEME_PREFERENCE } from './models/theme-preference.const';
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
    expect(THEME_STORAGE_KEY).toBe('sm-theme');
  });

  it.each(Object.values(THEME_PREFERENCE))('restores stored %s on init', (stored) => {
    stubSystemScheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, stored);
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
    expect(system.listenerCount()).toBe(1);

    TestBed.resetTestingModule();

    expect(system.listenerCount()).toBe(0);
  });
});
