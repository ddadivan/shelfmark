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
  CUSTOM_BACKGROUND_OWN,
  CUSTOM_THEME_ATTRIBUTE,
  LAYOUT_ATTRIBUTE,
  LAYOUT_OFF,
  MOTION_ATTRIBUTE,
  ReducedMotion,
  THEME,
  THEME_ATTRIBUTE,
  THEME_CUSTOM,
  customAccentTokens,
  customBackgroundTokens,
  type CustomAccentTokens,
  type Theme,
} from '@shelfmark/ui';
import type { Appearance } from './models/appearance.type';
import { SafeStorage } from '../storage/safe-storage.service';
import { STORAGE_KEY } from '../storage/models/storage-key.const';
import { wholeLayout } from './whole-layout';

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
  private readonly storage = inject(SafeStorage);
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
      const ownBackground = custom && isHexColour(customTheme.background);
      const values: Record<string, string> = {
        [CUSTOM_THEME_ATTRIBUTE.Base]: customTheme.base,
        [CUSTOM_THEME_ATTRIBUTE.Accent]: own ? CUSTOM_ACCENT_OWN : customTheme.accent,
        [CUSTOM_THEME_ATTRIBUTE.Background]: ownBackground
          ? CUSTOM_BACKGROUND_OWN
          : customTheme.background,
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
      // An own page background (#335): its nearest readable shade as `--bg` (CSSOM).
      if (ownBackground && isHexColour(customTheme.background)) {
        root.style.setProperty(
          '--bg',
          customBackgroundTokens(customTheme.background, customTheme.base)['--bg'],
        );
      } else {
        root.style.removeProperty('--bg');
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
        STORAGE_KEY.Theme,
        STORAGE_KEY.CustomTheme,
        STORAGE_KEY.Motion,
        STORAGE_KEY.Layout,
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
    this.store(STORAGE_KEY.Theme, preference);
  }

  setCustomTheme(theme: CustomTheme): void {
    this.customThemeState.set({ ...theme });
    this.store(STORAGE_KEY.CustomTheme, JSON.stringify(theme));
  }

  setMotion(motion: MotionPreference): void {
    this.motionState.set(motion);
    this.store(STORAGE_KEY.Motion, motion);
  }

  /** Text size, font, density and the card options, always whole. */
  setLayout(layout: LayoutSettings): void {
    const next = wholeLayout(layout);
    this.layoutState.set(next);
    this.store(STORAGE_KEY.Layout, JSON.stringify(next));
  }

  /** Applies (and remembers) the given appearance; the account settings call this when they load. */
  apply(appearance: Appearance): void {
    this.setPreference(appearance.theme);
    this.setCustomTheme(appearance.customTheme);
    this.setMotion(appearance.motion);
    this.setLayout(appearance);
  }

  private store(key: string, value: string): void {
    // Storage can be unavailable (private mode, blocked); the choice then lasts for the session.
    if (this.storage.getString(key) !== value) {
      this.storage.set(key, value);
    }
  }

  /**
   * Whether this browser holds a valid appearance of its own (a theme chosen before the account
   * stored one): the account settings keep it, and save it once, while the account has none.
   */
  hasStoredAppearance(): boolean {
    if (
      isThemePreference(this.read(STORAGE_KEY.Theme)) ||
      isMotionPreference(this.read(STORAGE_KEY.Motion))
    ) {
      return true;
    }
    return (
      this.parse(STORAGE_KEY.CustomTheme, isCustomTheme) !== null || this.readLayout() !== null
    );
  }

  /** The stored JSON under `key` when it passes `guard`; `null` when missing, broken or invalid. */
  private parse<T>(key: string, guard: (value: unknown) => value is T): T | null {
    return this.storage.getJson(key, guard, null);
  }

  /**
   * The stored layout. A copy saved with the retired `folderHighlight` key (#440) is read without
   * it: the key is ignored, the rest of the layout stays.
   */
  private readLayout(): LayoutSettings | null {
    const stored = this.parse(STORAGE_KEY.Layout, isLayoutSettings);
    return stored && wholeLayout(stored);
  }

  /** Takes every valid stored value; a missing or broken one keeps the current value. */
  private readStored(): void {
    const preference = this.read(STORAGE_KEY.Theme);
    if (isThemePreference(preference)) {
      this.preferenceState.set(preference);
    }
    const motion = this.read(STORAGE_KEY.Motion);
    if (isMotionPreference(motion)) {
      this.motionState.set(motion);
    }
    const custom = this.parse(STORAGE_KEY.CustomTheme, isCustomTheme);
    if (custom !== null) {
      this.customThemeState.set(custom);
    }
    const layout = this.readLayout();
    if (layout !== null) {
      this.layoutState.set(layout);
    }
  }

  private read(key: string): string | null {
    return this.storage.getString(key);
  }
}
