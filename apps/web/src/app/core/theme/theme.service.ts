import { DOCUMENT } from '@angular/common';
import { DestroyRef, Service, computed, effect, inject, signal } from '@angular/core';
import {
  APP_FONT,
  CARD_PREVIEW,
  CUSTOM_THEME_DEFAULT,
  DENSITY,
  LAYOUT_SETTINGS_DEFAULT,
  TEXT_SIZE,
  isLayoutSettings,
  type LayoutSettings,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  isCustomTheme,
  isHexColour,
  isMotionPreference,
  isThemePreference,
  type CustomTheme,
  type MotionPreference,
  type ThemePreference,
} from '@shelfmark/contracts';
import {
  CUSTOM_ACCENT_OWN,
  CUSTOM_THEME_ATTRIBUTE,
  LAYOUT_ATTRIBUTE,
  LAYOUT_OFF,
  MOTION_ATTRIBUTE,
  ReducedMotion,
  THEME,
  THEME_ATTRIBUTE,
  THEME_CUSTOM,
  customAccentTokens,
  type CustomAccentTokens,
  type Theme,
} from '@shelfmark/ui';
import type { Appearance } from './models/appearance.type';
import { CUSTOM_THEME_STORAGE_KEY } from './models/custom-theme-storage-key.const';
import { LAYOUT_STORAGE_KEY } from './models/layout-storage-key.const';
import { MOTION_STORAGE_KEY } from './models/motion-storage-key.const';
import { THEME_STORAGE_KEY } from './models/theme-storage-key.const';

const DARK_QUERY = '(prefers-color-scheme: dark)';
/** The custom properties an own accent colour sets on `html` (#315). */
const OWN_ACCENT_TOKENS: readonly (keyof CustomAccentTokens)[] = [
  '--accent',
  '--accent-bg',
  '--accent-text',
  '--focus-ring',
];
const STORAGE_EVENT = 'storage';

/**
 * Owns the appearance: theme (System, Light, Dark or Custom), the Custom theme, the
 * Animations setting and the text, layout and card options (#285). The only writer of
 * `html[data-theme]`, `html[data-custom-*]`, `html[data-motion]`, the `LAYOUT_ATTRIBUTE`
 * attributes (`data-text-size`, `data-font`, `data-density`, `data-card-*`; left out for the
 * defaults) and `color-scheme`; styles react through the tokens (`global.scss`,
 * `tokens/_custom.scss`) and the `reduced-motion` mixin, scripts through `ReducedMotion`. An own
 * accent colour of the Custom theme (#315) has no Sass rule: `data-custom-accent="own"` and the
 * four accent tokens from `customAccentTokens()` as custom properties on `html` (CSSOM, which the
 * strict CSP allows, like `color-scheme`), always in the nearest shade that keeps WCAG AA.
 *
 * The account is the source of truth (`UserSettingsStore` calls `applyAccount`); `localStorage`
 * keeps the last values so the first paint is already right (the app initializer calls `init()`
 * before the first render), and a change in another tab (a `storage` event) is followed here.
 */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reducedMotion = inject(ReducedMotion);

  private readonly preferenceState = signal<ThemePreference>(THEME_PREFERENCE.System);
  private readonly customThemeState = signal<CustomTheme>({ ...CUSTOM_THEME_DEFAULT });
  private readonly motionState = signal<MotionPreference>(MOTION_PREFERENCE.System);
  private readonly layoutState = signal<LayoutSettings>({ ...LAYOUT_SETTINGS_DEFAULT });
  private readonly systemDark = signal(false);

  readonly preference = this.preferenceState.asReadonly();
  readonly customTheme = this.customThemeState.asReadonly();
  readonly motion = this.motionState.asReadonly();
  /** Text size, font, density and the card options. */
  readonly layout = this.layoutState.asReadonly();
  /** The base the page is drawn on: the fixed theme, the system's, or the Custom theme's base. */
  readonly resolved = computed<Theme>(() => {
    switch (this.preferenceState()) {
      case THEME_PREFERENCE.Light:
        return THEME.Light;
      case THEME_PREFERENCE.Dark:
        return THEME.Dark;
      case THEME_PREFERENCE.Custom:
        return this.customThemeState().base;
      default:
        return this.systemDark() ? THEME.Dark : THEME.Light;
    }
  });
  /** The current appearance, as the account stores it. */
  readonly appearance = computed<Appearance>(() => ({
    theme: this.preferenceState(),
    customTheme: this.customThemeState(),
    motion: this.motionState(),
    ...this.layoutState(),
  }));

  private initialized = false;

  constructor() {
    // A root effect is flushed after the app initializer (which calls init()) and before the
    // first render, so the attributes are already set when the page is first painted.
    effect(() => {
      const root = this.document.documentElement;
      const theme = this.resolved();
      const custom = this.preferenceState() === THEME_PREFERENCE.Custom;
      root.setAttribute(THEME_ATTRIBUTE, custom ? THEME_CUSTOM : theme);
      root.style.colorScheme = theme;
      const customTheme = this.customThemeState();
      const own = custom && isHexColour(customTheme.accent);
      const values: Record<string, string> = {
        [CUSTOM_THEME_ATTRIBUTE.Base]: customTheme.base,
        [CUSTOM_THEME_ATTRIBUTE.Accent]: own ? CUSTOM_ACCENT_OWN : customTheme.accent,
        [CUSTOM_THEME_ATTRIBUTE.Background]: customTheme.background,
        [CUSTOM_THEME_ATTRIBUTE.Corners]: customTheme.corners,
      };
      for (const [name, value] of Object.entries(values)) {
        if (custom) {
          root.setAttribute(name, value);
        } else {
          root.removeAttribute(name);
        }
      }
      const tokens = own
        ? customAccentTokens(customTheme.accent, customTheme.base, customTheme.background)
        : null;
      for (const name of OWN_ACCENT_TOKENS) {
        if (tokens) {
          root.style.setProperty(name, tokens[name]);
        } else {
          root.style.removeProperty(name);
        }
      }
    });
    effect(() => {
      const motion = this.motionState();
      const root = this.document.documentElement;
      if (motion === MOTION_PREFERENCE.System) {
        root.removeAttribute(MOTION_ATTRIBUTE);
      } else {
        root.setAttribute(MOTION_ATTRIBUTE, motion);
      }
      this.reducedMotion.setAppReduced(motion === MOTION_PREFERENCE.Reduced);
    });
    effect(() => {
      const layout = this.layoutState();
      const root = this.document.documentElement;
      const values: Record<string, string | null> = {
        [LAYOUT_ATTRIBUTE.TextSize]: layout.textSize === TEXT_SIZE.M ? null : layout.textSize,
        [LAYOUT_ATTRIBUTE.Font]: layout.font === APP_FONT.Onest ? null : layout.font,
        [LAYOUT_ATTRIBUTE.Density]: layout.density === DENSITY.Comfortable ? null : layout.density,
        [LAYOUT_ATTRIBUTE.CardPreview]:
          layout.cardPreview === CARD_PREVIEW.Large ? null : layout.cardPreview,
        [LAYOUT_ATTRIBUTE.CardSite]: layout.cardSite ? null : LAYOUT_OFF,
        [LAYOUT_ATTRIBUTE.CardNotes]: layout.cardNotes ? null : LAYOUT_OFF,
        [LAYOUT_ATTRIBUTE.CardTags]: layout.cardTags ? null : LAYOUT_OFF,
      };
      for (const [name, value] of Object.entries(values)) {
        if (value === null) {
          root.removeAttribute(name);
        } else {
          root.setAttribute(name, value);
        }
      }
    });
  }

  /** Reads the stored appearance, follows the system scheme and other tabs. Idempotent. */
  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.readStored();

    const view = this.document.defaultView;
    const query = view?.matchMedia?.(DARK_QUERY);
    if (query) {
      this.systemDark.set(query.matches);
      const onChange = (event: MediaQueryListEvent): void => this.systemDark.set(event.matches);
      query.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
    }

    if (view) {
      const keys: (string | null)[] = [
        THEME_STORAGE_KEY,
        CUSTOM_THEME_STORAGE_KEY,
        MOTION_STORAGE_KEY,
        LAYOUT_STORAGE_KEY,
        null, // `localStorage.clear()` in another tab
      ];
      const onStorage = (event: StorageEvent): void => {
        if (keys.includes(event.key)) {
          this.readStored();
        }
      };
      view.addEventListener(STORAGE_EVENT, onStorage);
      this.destroyRef.onDestroy(() => view.removeEventListener(STORAGE_EVENT, onStorage));
    }
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceState.set(preference);
    this.store(THEME_STORAGE_KEY, preference);
  }

  setCustomTheme(theme: CustomTheme): void {
    this.customThemeState.set({ ...theme });
    this.store(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(theme));
  }

  setMotion(motion: MotionPreference): void {
    this.motionState.set(motion);
    this.store(MOTION_STORAGE_KEY, motion);
  }

  /** Text size, font, density and the card options, always whole. */
  setLayout(layout: LayoutSettings): void {
    const next: LayoutSettings = {
      textSize: layout.textSize,
      font: layout.font,
      density: layout.density,
      cardPreview: layout.cardPreview,
      cardSite: layout.cardSite,
      cardNotes: layout.cardNotes,
      cardTags: layout.cardTags,
    };
    this.layoutState.set(next);
    this.store(LAYOUT_STORAGE_KEY, JSON.stringify(next));
  }

  /** Applies (and remembers) the given appearance; the account settings call this when they load. */
  apply(appearance: Appearance): void {
    this.setPreference(appearance.theme);
    this.setCustomTheme(appearance.customTheme);
    this.setMotion(appearance.motion);
    this.setLayout(appearance);
  }

  private store(key: string, value: string): void {
    try {
      if (this.document.defaultView?.localStorage.getItem(key) !== value) {
        this.document.defaultView?.localStorage.setItem(key, value);
      }
    } catch {
      // Storage can be unavailable (private mode, blocked); the choice then lasts for the session.
    }
  }

  /**
   * Whether this browser holds a valid appearance of its own (a theme chosen before the account
   * stored one): the account settings keep it, and save it once, while the account has none.
   */
  hasStoredAppearance(): boolean {
    if (
      isThemePreference(this.read(THEME_STORAGE_KEY)) ||
      isMotionPreference(this.read(MOTION_STORAGE_KEY))
    ) {
      return true;
    }
    return (
      this.parse(CUSTOM_THEME_STORAGE_KEY, isCustomTheme) !== null ||
      this.parse(LAYOUT_STORAGE_KEY, isLayoutSettings) !== null
    );
  }

  /** The stored JSON under `key` when it passes `guard`; `null` when missing, broken or invalid. */
  private parse<T>(key: string, guard: (value: unknown) => value is T): T | null {
    try {
      const parsed: unknown = JSON.parse(this.read(key) ?? 'null');
      return guard(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  /** Takes every valid stored value; a missing or broken one keeps the current value. */
  private readStored(): void {
    const preference = this.read(THEME_STORAGE_KEY);
    if (isThemePreference(preference)) {
      this.preferenceState.set(preference);
    }
    const motion = this.read(MOTION_STORAGE_KEY);
    if (isMotionPreference(motion)) {
      this.motionState.set(motion);
    }
    const custom = this.parse(CUSTOM_THEME_STORAGE_KEY, isCustomTheme);
    if (custom !== null) {
      this.customThemeState.set(custom);
    }
    const layout = this.parse(LAYOUT_STORAGE_KEY, isLayoutSettings);
    if (layout !== null) {
      this.layoutState.set(layout);
    }
  }

  private read(key: string): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
}
