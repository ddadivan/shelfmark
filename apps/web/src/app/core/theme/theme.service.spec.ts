import { TestBed } from '@angular/core/testing';
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
    delete document.documentElement.dataset['theme'];
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('defaults to the system preference', () => {
    stubSystemScheme(false);
    expect(TestBed.inject(ThemeService).preference()).toBe('system');
  });

  it('resolves system to dark when the OS prefers dark', () => {
    stubSystemScheme(true);
    const service = createService();

    expect(service.resolved()).toBe('dark');
  });

  it('resolves system to light when the OS prefers light', () => {
    stubSystemScheme(false);
    const service = createService();

    expect(service.resolved()).toBe('light');
  });

  it.each(['light', 'dark'] as const)('explicit %s overrides the system scheme', (theme) => {
    stubSystemScheme(theme === 'light');
    const service = createService();
    service.setPreference(theme);

    expect(service.resolved()).toBe(theme);
  });

  it('persists the preference to localStorage under sm-theme', () => {
    stubSystemScheme(false);
    const service = createService();
    service.setPreference('dark');

    expect(localStorage.getItem('sm-theme')).toBe('dark');
  });

  it.each(['light', 'dark', 'system'] as const)('restores stored %s on init', (stored) => {
    stubSystemScheme(false);
    localStorage.setItem('sm-theme', stored);
    const service = createService();

    expect(service.preference()).toBe(stored);
  });

  it('falls back to system when the stored value is invalid', () => {
    stubSystemScheme(false);
    localStorage.setItem('sm-theme', 'purple');
    const service = createService();

    expect(service.preference()).toBe('system');
  });

  it('does not crash when reading localStorage throws', () => {
    stubSystemScheme(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    const service = createService();

    expect(service.preference()).toBe('system');
  });

  it('keeps the choice for the session when writing localStorage throws', () => {
    stubSystemScheme(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const service = createService();

    expect(() => service.setPreference('dark')).not.toThrow();
    expect(service.preference()).toBe('dark');
    expect(service.resolved()).toBe('dark');
  });

  it('updates the resolved theme on system change while preference is system', () => {
    const system = stubSystemScheme(false);
    const service = createService();

    system.emit(true);
    TestBed.tick();

    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('ignores system changes when an explicit preference is set', () => {
    const system = stubSystemScheme(false);
    const service = createService();
    service.setPreference('light');

    system.emit(true);
    TestBed.tick();

    expect(service.resolved()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('writes data-theme and color-scheme on the root element', () => {
    stubSystemScheme(true);
    const service = createService();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    service.setPreference('light');
    TestBed.tick();

    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('stops listening to the system scheme when destroyed', () => {
    const system = stubSystemScheme(false);
    createService();
    expect(system.listenerCount()).toBe(1);

    TestBed.resetTestingModule();

    expect(system.listenerCount()).toBe(0);
  });
});
