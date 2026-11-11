import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUNDS,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  CUSTOM_THEME_DEFAULT,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  isMotionPreference,
  isThemePreference,
  type CustomTheme,
} from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  SegmentedControlComponent,
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
} from '@shelfmark/ui';
import type { Appearance } from '../../../core/theme/models/appearance.type';
import { ThemeService } from '../../../core/theme/theme.service';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { THEME_OPTION_KEYS } from '../models/theme-option-keys.const';
import { SettingsPageHeaderComponent } from '../settings-page-header/settings-page-header.component';

const KEY = 'settings.appearance';
const SYSTEM_THUMB = 'system';

/**
 * `/settings/appearance` (Themes mockup, issue #273): Theme (System, Light, Dark, Custom); for
 * Custom the base, accent, background and corners and "Reset custom theme"; Animations; a live
 * preview; the language. Every change applies to the whole app at once (ThemeService) and is
 * saved on the account right away, so the preview simply shows a sample in the current tokens;
 * a failed save puts the old appearance back and says so. Light and Dark never change.
 */
@Component({
  selector: 'app-settings-appearance-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    SegmentedControlComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
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
  protected readonly SETTINGS_ROW_ALIGN = SETTINGS_ROW_ALIGN;
  protected readonly THEME_PICKER_KIND = THEME_PICKER_KIND;
  protected readonly THEME_PREFERENCE = THEME_PREFERENCE;

  protected readonly theme = inject(ThemeService);
  private readonly settings = inject(UserSettingsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);

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
          ? { theme: THEME_CUSTOM, ...custom }
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

  protected readonly previewFolders = computed<string[]>(() =>
    this.labels(['angular', 'clothes', 'recipes'], `${KEY}.preview.folders`).map((o) => o.label),
  );

  protected readonly previewCards = computed<ThemePreviewCard[]>(() => {
    this.translation();
    return ['one', 'two'].map((card) => ({
      site: this.transloco.translate(`${KEY}.preview.cards.${card}.site`),
      title: this.transloco.translate(`${KEY}.preview.cards.${card}.title`),
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
      this.setCustom({ accent });
    }
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
    void this.save({ customTheme: { ...CUSTOM_THEME_DEFAULT } });
  }

  protected setMotion(value: string): void {
    if (isMotionPreference(value)) {
      void this.save({ motion: value });
    }
  }

  private setCustom(change: Partial<CustomTheme>): void {
    void this.save({ customTheme: { ...this.theme.customTheme(), ...change } });
  }

  private async save(change: Partial<Appearance>): Promise<void> {
    if (!(await this.settings.setAppearance(change))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate(`${KEY}.failed`),
        detail: this.transloco.translate(`${KEY}.failedDetail`),
      });
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
