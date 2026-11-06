import { DOCUMENT } from '@angular/common';
import { DestroyRef, Service, computed, effect, inject, signal } from '@angular/core';
import { THEME, THEME_ATTRIBUTE, Theme } from '@shelfmark/ui';
import { THEME_PREFERENCE } from './models/theme-preference.const';
import { ThemePreference } from './models/theme-preference.type';
import { THEME_STORAGE_KEY } from './models/theme-storage-key.const';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Owns the colour theme. The only writer of `html[data-theme]` and `color-scheme`;
 * styles react to `data-theme` through the tokens (docs/design/tokens.css).
 */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly preferenceState = signal<ThemePreference>(THEME_PREFERENCE.System);
  private readonly systemDark = signal(false);

  readonly preference = this.preferenceState.asReadonly();
  readonly resolved = computed<Theme>(() => {
    const preference = this.preferenceState();
    if (preference === THEME_PREFERENCE.System) {
      return this.systemDark() ? THEME.Dark : THEME.Light;
    }
    return preference;
  });

  private initialized = false;

  constructor() {
    // A root effect is flushed after the app initializer (which calls init()) and before the
    // first render, so data-theme is already set when the page is first painted.
    effect(() => {
      const theme = this.resolved();
      const root = this.document.documentElement;
      root.setAttribute(THEME_ATTRIBUTE, theme);
      root.style.colorScheme = theme;
    });
  }

  /** Reads the stored preference and starts following the system scheme. */
  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    const stored = this.readStored();
    if (stored) {
      this.preferenceState.set(stored);
    }

    const query = this.document.defaultView?.matchMedia(DARK_QUERY);
    if (query) {
      this.systemDark.set(query.matches);
      const onChange = (event: MediaQueryListEvent): void => this.systemDark.set(event.matches);
      query.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
    }
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceState.set(preference);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Storage can be unavailable (private mode, blocked); the choice then lasts for the session.
    }
  }

  private readStored(): ThemePreference | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      return Object.values<string>(THEME_PREFERENCE).includes(value ?? '')
        ? (value as ThemePreference)
        : null;
    } catch {
      return null;
    }
  }
}
