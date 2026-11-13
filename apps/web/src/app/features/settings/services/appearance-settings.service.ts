import { computed, inject, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUNDS,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  CUSTOM_THEME_DEFAULT,
  isAppFont,
  isCardPreview,
  isDensity,
  isHexColour,
  isMotionPreference,
  isTextSize,
  isThemePreference,
  type CustomTheme,
} from '@shelfmark/contracts';
import {
  TOAST_KIND,
  ToastService,
  accentContrast,
  backgroundContrast,
  isAccessibleAccent,
  isReadableBackground,
  nearestAccessibleAccent,
  nearestReadableBackground,
  type ColorPickerComponent,
  type SwitchComponent,
} from '@shelfmark/ui';
import { OwnColourActionsService } from '../../../core/colours/own-colour-actions.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import type { Appearance } from '../../../core/theme/models/appearance.type';
import { ThemeService } from '../../../core/theme/theme.service';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import type { AccentWarning } from '../models/accent-warning.interface';

const KEY = 'settings.appearance';

/**
 * The write side of Settings › Appearance: every change applies at once (ThemeService) and is
 * saved on the account through `UserSettingsStore`; a failed save puts the old appearance back
 * (the store) and says so in a toast. Values outside the lists are ignored. Also the Custom
 * theme's own colours (#315, #335): a colour that keeps 4.5:1 becomes the accent or background
 * and a swatch of the account, one that does not is refused with a warning that offers the
 * nearest shade that passes. Scoped to the page through its `providers`.
 */
@Service()
export class AppearanceSettingsService {
  private readonly theme = inject(ThemeService);
  private readonly settings = inject(UserSettingsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);
  private readonly ownColours = inject(OwnColourActionsService);
  private readonly locale = inject(LocaleService);

  /** The own accent colour of the Custom theme (#315), or null for a curated accent. */
  readonly ownAccent = computed(() => {
    const accent = this.theme.customTheme().accent;
    return isHexColour(accent) ? accent : null;
  });
  /** The own page background of the Custom theme (#335), or null for a curated one. */
  readonly ownBackground = computed(() => {
    const background = this.theme.customTheme().background;
    return isHexColour(background) ? background : null;
  });

  /** What the accent picker shows while open: the colour being picked (empty again once it is a swatch). */
  readonly pickedColour = signal('');
  /** What the background picker shows while open. */
  readonly pickedBackground = signal('');
  /** A picked accent that would not keep 4.5:1, with the nearest shade that does. */
  readonly accentWarning = signal<AccentWarning | null>(null);
  /** A picked background that would not keep text at 4.5:1, with the nearest shade that does. */
  readonly backgroundWarning = signal<AccentWarning | null>(null);

  setTheme(value: string): void {
    if (isThemePreference(value)) {
      void this.save({ theme: value });
    }
  }

  setMotion(value: string): void {
    if (isMotionPreference(value)) {
      void this.save({ motion: value });
    }
  }

  setTextSize(value: string): void {
    if (isTextSize(value)) {
      void this.save({ textSize: value });
    }
  }

  setFont(value: string): void {
    if (isAppFont(value)) {
      void this.save({ font: value });
    }
  }

  setDensity(value: string): void {
    if (isDensity(value)) {
      void this.save({ density: value });
    }
  }

  setPreviewImage(value: string): void {
    if (isCardPreview(value)) {
      void this.save({ cardPreview: value });
    }
  }

  setCardPart(change: Pick<Partial<Appearance>, 'cardSite' | 'cardNotes' | 'cardTags'>): void {
    void this.save(change);
  }

  /** A failed save puts the switch back (the account value never changed, so no binding does). */
  async setFolderColours(on: boolean, control: SwitchComponent): Promise<void> {
    if (!(await this.settings.setFolderColours(on))) {
      control.checked.set(!on);
      this.failed();
    }
  }

  setBase(value: string): void {
    if (value === this.theme.customTheme().base) {
      return;
    }
    const base =
      value === CUSTOM_THEME_BASE.Dark ? CUSTOM_THEME_BASE.Dark : CUSTOM_THEME_BASE.Light;
    // A curated background belongs to one base: switching takes the first one of the new base. An
    // own background colour fits both (it is drawn in its readable shade for the new base).
    this.setCustom({
      base,
      background: this.ownBackground() ?? CUSTOM_THEME_BACKGROUNDS[base][0],
    });
  }

  /** A curated accent, or an own colour swatch (applied when it keeps 4.5:1, else the warning). */
  setAccent(value: string, picker: ColorPickerComponent): void {
    if (isHexColour(value)) {
      this.pickOwnAccent(value, picker, false);
      return;
    }
    const accent = Object.values(CUSTOM_THEME_ACCENT).find((name) => name === value);
    if (accent) {
      this.accentWarning.set(null);
      this.setCustom({ accent });
    }
  }

  /**
   * A colour finished in the picker (#315): one that keeps 4.5:1 on the current base and
   * background becomes the accent at once (and a swatch, with `remember`); one that does not is
   * not applied, a warning offers the nearest shade that passes instead.
   */
  pickOwnAccent(colour: string, picker: ColorPickerComponent, remember = true): void {
    if (!isHexColour(colour)) {
      return;
    }
    const { base, background } = this.theme.customTheme();
    this.pickedColour.set(colour);
    if (isAccessibleAccent(colour, base, background)) {
      // Kept as a swatch only once it is the accent (a refused colour is not remembered).
      if (remember) {
        void this.settings.addCustomColour(colour);
      }
      this.accentWarning.set(null);
      this.setCustom({ accent: colour });
      closePicker(picker);
      return;
    }
    this.accentWarning.set({
      colour,
      ratio: this.ratio(accentContrast(colour, base, background)),
      shade: nearestAccessibleAccent(colour, base, background),
    });
  }

  /** "Use <shade>" in the accent warning. */
  useShade(shade: string, picker: ColorPickerComponent): void {
    if (!isHexColour(shade)) {
      return;
    }
    this.pickedColour.set(shade);
    this.accentWarning.set(null);
    void this.settings.addCustomColour(shade);
    this.setCustom({ accent: shade });
    closePicker(picker);
  }

  /** A curated background of the base, or an own colour swatch (checked like a picked one). */
  setBackground(value: string, picker: ColorPickerComponent): void {
    if (isHexColour(value)) {
      this.pickOwnBackground(value, picker, false);
      return;
    }
    const base = this.theme.customTheme().base;
    const background = CUSTOM_THEME_BACKGROUNDS[base].find((name) => name === value);
    if (background) {
      this.setCustom({ background });
    }
  }

  /**
   * A background colour finished in the picker (#335): one that keeps text and muted text at
   * 4.5:1 becomes the background at once; one that does not is not applied, a warning offers the
   * nearest shade that passes.
   */
  pickOwnBackground(colour: string, picker: ColorPickerComponent, remember = true): void {
    if (!isHexColour(colour)) {
      return;
    }
    const base = this.theme.customTheme().base;
    this.pickedBackground.set(colour);
    if (isReadableBackground(colour, base)) {
      if (remember) {
        void this.settings.addCustomColour(colour);
      }
      this.backgroundWarning.set(null);
      this.setCustom({ background: colour });
      closePicker(picker);
      return;
    }
    this.backgroundWarning.set({
      colour,
      ratio: this.ratio(backgroundContrast(colour, base)),
      shade: nearestReadableBackground(colour, base),
    });
  }

  /** "Use <shade>" in the background warning. */
  useBackgroundShade(shade: string, picker: ColorPickerComponent): void {
    if (!isHexColour(shade)) {
      return;
    }
    this.pickedBackground.set(shade);
    this.backgroundWarning.set(null);
    void this.settings.addCustomColour(shade);
    this.setCustom({ background: shade });
    closePicker(picker);
  }

  setCorners(value: string): void {
    const corners = Object.values(CUSTOM_THEME_CORNERS).find((name) => name === value);
    if (corners) {
      this.setCustom({ corners });
    }
  }

  resetCustom(): void {
    this.pickedColour.set('');
    this.pickedBackground.set('');
    this.accentWarning.set(null);
    this.backgroundWarning.set(null);
    void this.save({ customTheme: { ...CUSTOM_THEME_DEFAULT } });
  }

  /** The swatch of an own colour was removed: forgotten from the account, with an Undo toast. */
  removeOwnColour(colour: string): void {
    void this.ownColours.remove(colour);
  }

  /** Rounded down, so a colour just short of 4.5:1 never reads as 4.5. */
  private ratio(contrast: number): string {
    return this.locale.formatNumber(Math.floor(contrast * 10) / 10);
  }

  private setCustom(change: Partial<CustomTheme>): void {
    void this.save({ customTheme: { ...this.theme.customTheme(), ...change } });
  }

  private async save(change: Partial<Appearance>): Promise<void> {
    if (!(await this.settings.setAppearance(change))) {
      this.failed();
    }
  }

  private failed(): void {
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.transloco.translate(`${KEY}.failed`),
      detail: this.transloco.translate(`${KEY}.failedDetail`),
    });
  }
}

/** The colour is a swatch now: the "+" swatch closes and starts empty again. */
function closePicker(picker: ColorPickerComponent): void {
  picker.open.set(false);
  picker.clear();
}
