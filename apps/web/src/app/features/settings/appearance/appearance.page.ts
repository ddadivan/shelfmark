import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  APP_FONT,
  CARD_PREVIEW,
  DENSITY,
  TEXT_SIZE,
  isAppFont,
  isCardPreview,
  isDensity,
  isTextSize,
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUNDS,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  CUSTOM_THEME_DEFAULT,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  isHexColour,
  isMotionPreference,
  isThemePreference,
  type CustomTheme,
} from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  ColorPickerComponent,
  CUSTOM_ACCENT_OWN,
  NOTICE_KIND,
  NoticeComponent,
  SegmentedControlComponent,
  SwitchComponent,
  SETTINGS_ROW_ALIGN,
  SettingsRowComponent,
  SettingsSectionComponent,
  THEME_CUSTOM,
  THEME_PICKER_KIND,
  ThemePickerComponent,
  ThemePreviewComponent,
  TOAST_KIND,
  ToastService,
  type SegmentedOption,
  type ThemePickerOption,
  type ThemePreviewCard,
  accentContrast,
  customAccentTokens,
  isAccessibleAccent,
  nearestAccessibleAccent,
} from '@shelfmark/ui';
import type { Appearance } from '../../../core/theme/models/appearance.type';
import { LocaleService } from '../../../core/i18n/locale.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import type { AccentWarning } from '../models/accent-warning.interface';
import { THEME_OPTION_KEYS } from '../models/theme-option-keys.const';
import { SettingsPageHeaderComponent } from '../settings-page-header/settings-page-header.component';

const KEY = 'settings.appearance';
const SYSTEM_THUMB = 'system';

/**
 * `/settings/appearance` (Themes mockup, issues #273 and #285): Theme (System, Light, Dark,
 * Custom); for Custom the base, accent, background and corners and "Reset custom theme"; a live
 * preview; Text and layout (text size, font, density); Cards (preview image, site, notes, tags);
 * Sidebar and motion (folder colours, Animations). Link counts live in Library, "Remember
 * recently opened" in Privacy and data (#315). Every change applies to the whole app at once (ThemeService) and is
 * saved on the account right away, so the preview simply shows a sample in the current tokens;
 * a failed save puts the old appearance back and says so. Light and Dark never change.
 */
@Component({
  selector: 'app-settings-appearance-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    ColorPickerComponent,
    NoticeComponent,
    SegmentedControlComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
    SwitchComponent,
    ThemePickerComponent,
    ThemePreviewComponent,
  ],
  templateUrl: './appearance.page.html',
  styleUrl: './appearance.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppearancePage {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly SETTINGS_ROW_ALIGN = SETTINGS_ROW_ALIGN;
  protected readonly THEME_PICKER_KIND = THEME_PICKER_KIND;
  protected readonly THEME_PREFERENCE = THEME_PREFERENCE;

  protected readonly theme = inject(ThemeService);
  protected readonly settings = inject(UserSettingsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);
  private readonly locale = inject(LocaleService);

  /** Changes when the translations load, so the labels below are computed again. */
  private readonly translation = toSignal(this.transloco.selectTranslation());

  protected readonly isCustom = computed(() => this.theme.preference() === THEME_PREFERENCE.Custom);

  protected readonly themeOptions = computed<ThemePickerOption[]>(() => {
    this.translation();
    const custom = this.theme.customTheme();
    return Object.values(THEME_PREFERENCE).map((value) => ({
      value,
      label: this.transloco.translate(THEME_OPTION_KEYS[value]),
      ...(value === THEME_PREFERENCE.System
        ? { theme: SYSTEM_THUMB }
        : value === THEME_PREFERENCE.Custom
          ? { theme: THEME_CUSTOM, ...custom, ...this.ownAccentDrawing(custom) }
          : { theme: value }),
    }));
  });

  protected readonly baseOptions = computed<SegmentedOption[]>(() =>
    this.labels(Object.values(CUSTOM_THEME_BASE), `${KEY}.custom.base`),
  );

  protected readonly accentOptions = computed<ThemePickerOption[]>(() => {
    const base = this.theme.customTheme().base;
    return this.labels(Object.values(CUSTOM_THEME_ACCENT), `${KEY}.custom.accent`).map(
      (option) => ({ ...option, theme: THEME_CUSTOM, base, accent: option.value }),
    );
  });

  /** The own accent colour of the Custom theme (#315), or null for a curated accent. */
  protected readonly ownAccent = computed(() => {
    const accent = this.theme.customTheme().accent;
    return isHexColour(accent) ? accent : null;
  });

  /** The curated accent that is checked; none while an own colour is the accent. */
  protected readonly curatedAccent = computed(() =>
    this.ownAccent() === null ? this.theme.customTheme().accent : '',
  );

  /** What the colour picker shows: the last colour picked here, else the saved own colour. */
  protected readonly pickedColour = signal('');
  protected readonly shownColour = computed(() => this.pickedColour() || (this.ownAccent() ?? ''));

  /** A picked colour that would not keep 4.5:1, with the nearest shade that does. */
  protected readonly accentWarning = signal<AccentWarning | null>(null);

  protected readonly backgroundOptions = computed<ThemePickerOption[]>(() => {
    const base = this.theme.customTheme().base;
    return this.labels(CUSTOM_THEME_BACKGROUNDS[base], `${KEY}.custom.background`).map(
      (option) => ({ ...option, theme: THEME_CUSTOM, base, background: option.value }),
    );
  });

  protected readonly cornerOptions = computed<SegmentedOption[]>(() =>
    this.labels(Object.values(CUSTOM_THEME_CORNERS), `${KEY}.custom.corners`),
  );

  protected readonly motionOptions = computed<SegmentedOption[]>(() =>
    this.labels(Object.values(MOTION_PREFERENCE), `${KEY}.motion`),
  );

  protected readonly textSizeOptions = computed<SegmentedOption[]>(() =>
    this.labels(Object.values(TEXT_SIZE), `${KEY}.layout.textSize`),
  );

  protected readonly fontOptions = computed<SegmentedOption[]>(() =>
    this.labels(Object.values(APP_FONT), `${KEY}.layout.font`),
  );

  protected readonly densityOptions = computed<SegmentedOption[]>(() =>
    this.labels(Object.values(DENSITY), `${KEY}.layout.density`),
  );

  protected readonly previewImageOptions = computed<SegmentedOption[]>(() =>
    this.labels(Object.values(CARD_PREVIEW), `${KEY}.cards.preview`),
  );

  /** Sample link counts of the preview's sidebar rows. */
  protected readonly previewCounts = [12, 7, 23];

  protected readonly previewRecent = computed(() => {
    this.translation();
    return this.settings.historyPaused() ? '' : this.transloco.translate(`${KEY}.preview.recent`);
  });

  protected readonly previewFolders = computed<string[]>(() =>
    this.labels(['angular', 'clothes', 'recipes'], `${KEY}.preview.folders`).map((o) => o.label),
  );

  protected readonly previewCards = computed<ThemePreviewCard[]>(() => {
    this.translation();
    return ['one', 'two'].map((card) => ({
      site: this.transloco.translate(`${KEY}.preview.cards.${card}.site`),
      title: this.transloco.translate(`${KEY}.preview.cards.${card}.title`),
      note: this.transloco.translate(`${KEY}.preview.cards.${card}.note`),
      tag: this.transloco.translate(`${KEY}.preview.cards.${card}.tag`),
    }));
  });

  protected setTheme(value: string): void {
    if (isThemePreference(value)) {
      void this.save({ theme: value });
    }
  }

  protected setBase(value: string): void {
    const current = this.theme.customTheme();
    if (value === current.base) {
      return;
    }
    const base =
      value === CUSTOM_THEME_BASE.Dark ? CUSTOM_THEME_BASE.Dark : CUSTOM_THEME_BASE.Light;
    // A background belongs to one base: switching takes the first background of the new base.
    this.setCustom({ base, background: CUSTOM_THEME_BACKGROUNDS[base][0] });
  }

  protected setAccent(value: string): void {
    const accent = Object.values(CUSTOM_THEME_ACCENT).find((name) => name === value);
    if (accent) {
      this.accentWarning.set(null);
      this.setCustom({ accent });
    }
  }

  /**
   * A colour finished in the picker (#315): one that keeps 4.5:1 on the current base and
   * background becomes the accent at once; one that does not is not applied, a warning offers the
   * nearest shade that passes instead.
   */
  protected pickOwnAccent(colour: string): void {
    if (!isHexColour(colour)) {
      return;
    }
    const { base, background } = this.theme.customTheme();
    this.pickedColour.set(colour);
    if (isAccessibleAccent(colour, base, background)) {
      this.accentWarning.set(null);
      this.setCustom({ accent: colour });
      return;
    }
    this.accentWarning.set({
      colour,
      // Rounded down, so a colour just short of 4.5:1 never reads as 4.5.
      ratio: this.locale.formatNumber(
        Math.floor(accentContrast(colour, base, background) * 10) / 10,
      ),
      shade: nearestAccessibleAccent(colour, base, background),
    });
  }

  protected useShade(shade: string): void {
    if (!isHexColour(shade)) {
      return;
    }
    this.pickedColour.set(shade);
    this.accentWarning.set(null);
    this.setCustom({ accent: shade });
  }

  protected setBackground(value: string): void {
    const base = this.theme.customTheme().base;
    const background = CUSTOM_THEME_BACKGROUNDS[base].find((name) => name === value);
    if (background) {
      this.setCustom({ background });
    }
  }

  protected setCorners(value: string): void {
    const corners = Object.values(CUSTOM_THEME_CORNERS).find((name) => name === value);
    if (corners) {
      this.setCustom({ corners });
    }
  }

  protected resetCustom(): void {
    this.pickedColour.set('');
    this.accentWarning.set(null);
    void this.save({ customTheme: { ...CUSTOM_THEME_DEFAULT } });
  }

  /** The Custom thumbnail of an own accent: no Sass rule, the derived tokens instead. */
  private ownAccentDrawing(custom: CustomTheme): Partial<ThemePickerOption> {
    if (!isHexColour(custom.accent)) {
      return {};
    }
    return {
      accent: CUSTOM_ACCENT_OWN,
      tokens: Object.fromEntries(
        Object.entries(customAccentTokens(custom.accent, custom.base, custom.background)),
      ),
    };
  }

  protected setMotion(value: string): void {
    if (isMotionPreference(value)) {
      void this.save({ motion: value });
    }
  }

  protected setTextSize(value: string): void {
    if (isTextSize(value)) {
      void this.save({ textSize: value });
    }
  }

  protected setFont(value: string): void {
    if (isAppFont(value)) {
      void this.save({ font: value });
    }
  }

  protected setDensity(value: string): void {
    if (isDensity(value)) {
      void this.save({ density: value });
    }
  }

  protected setPreviewImage(value: string): void {
    if (isCardPreview(value)) {
      void this.save({ cardPreview: value });
    }
  }

  protected setCardPart(
    change: Pick<Partial<Appearance>, 'cardSite' | 'cardNotes' | 'cardTags'>,
  ): void {
    void this.save(change);
  }

  /** A failed save puts the switch back (the account value never changed, so no binding does). */
  protected async setFolderColours(on: boolean, control: SwitchComponent): Promise<void> {
    if (!(await this.settings.setFolderColours(on))) {
      control.checked.set(!on);
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

  private setCustom(change: Partial<CustomTheme>): void {
    void this.save({ customTheme: { ...this.theme.customTheme(), ...change } });
  }

  private async save(change: Partial<Appearance>): Promise<void> {
    if (!(await this.settings.setAppearance(change))) {
      this.failed();
    }
  }

  /** Options labelled by `<prefix>.<value>` (recomputed when the translations load). */
  private labels(values: readonly string[], prefix: string): { value: string; label: string }[] {
    this.translation();
    return values.map((value) => ({
      value,
      label: this.transloco.translate(`${prefix}.${value}`),
    }));
  }
}
