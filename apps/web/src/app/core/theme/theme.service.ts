import { DOCUMENT } from '@angular/common';
import { DestroyRef, Service, computed, effect, inject, signal } from '@angular/core';
import { ResolvedTheme } from './models/resolved-theme.type';
import { ThemePreference } from './models/theme-preference.type';

const STORAGE_KEY = 'sm-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Owns the colour theme. The only writer of `html[data-theme]` and `color-scheme`;
 * styles react to `data-theme` through the tokens (docs/design/tokens.css).
 */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly preferenceState = signal<ThemePreference>('system');
  private readonly systemDark = signal(false);

  readonly preference = this.preferenceState.asReadonly();
  readonly resolved = computed<ResolvedTheme>(() => {
    const preference = this.preferenceState();
    if (preference === 'system') {
      return this.systemDark() ? 'dark' : 'light';
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
      root.dataset['theme'] = theme;
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
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Storage can be unavailable (private mode, blocked); the choice then lasts for the session.
    }
  }

  private readStored(): ThemePreference | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return value === 'system' || value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }
}
