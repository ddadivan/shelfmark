import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  APP_FONT,
  CARD_PREVIEW,
  DENSITY,
  TEXT_SIZE,
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUNDS,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  isHexColour,
  type CustomTheme,
} from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  ColorPickerComponent,
  CUSTOM_ACCENT_OWN,
  CUSTOM_BACKGROUND_OWN,
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
  type SegmentedOption,
  type ThemePickerOption,
  type ThemePreviewCard,
  customBackgroundTokens,
  customAccentTokens,
} from '@shelfmark/ui';
import { ThemeService } from '../../../../core/theme/theme.service';
import { OwnColourActionsService } from '../../../../core/colours/own-colour-actions.service';
import { activeLang } from '../../../../core/i18n/active-lang';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { AppearanceSettingsService } from '../../services/appearance-settings.service';
import { THEME_OPTION_KEYS } from '../../models/theme-option-keys.const';
import { DateTimeSettingsComponent } from './date-time-settings/date-time-settings.component';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';

const KEY = 'settings.appearance';
const SYSTEM_THUMB = 'system';

/**
 * `/settings/appearance` (Themes mockup, issues #273 and #285): Theme (System, Light, Dark,
 * Custom); for Custom the base, accent, background and corners and "Reset custom theme"; a live
 * preview; Text and layout (text size, font, density); Cards (preview image, site, notes, tags);
 * Dates and numbers (date format, clock, week start, preview; moved from Language in #315);
 * Sidebar and motion (folder colours, Animations). Link counts live in Library, "Remember
 * recently opened" in Privacy and data (#315). Every change applies to the whole app at once
 * (ThemeService) and is saved on the account right away, so the preview simply shows a sample in
 * the current tokens; a failed save puts the old appearance back and says so. Light and Dark never
 * change. The page builds the options and the preview; every change goes through the page-scoped
 * `AppearanceSettingsService`.
 */
@Component({
  selector: 'app-settings-appearance-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    ColorPickerComponent,
    DateTimeSettingsComponent,
    NoticeComponent,
    SegmentedControlComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
    SwitchComponent,
    ThemePickerComponent,
    ThemePreviewComponent,
  ],
  providers: [AppearanceSettingsService],
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
  protected readonly appearance = inject(AppearanceSettingsService);
  private readonly transloco = inject(TranslocoService);
  private readonly ownColours = inject(OwnColourActionsService);

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

  /**
   * The curated accents, then the own colours of the account (#335) as swatches, each drawn in the
   * shade it gets on the current base and background; a chosen own colour is always among them.
   */
  protected readonly accentOptions = computed<ThemePickerOption[]>(() => {
    const { base, background } = this.theme.customTheme();
    const curated = this.labels(Object.values(CUSTOM_THEME_ACCENT), `${KEY}.custom.accent`).map(
      (option) => ({ ...option, theme: THEME_CUSTOM, base, accent: option.value }),
    );
    const own = this.withChosen(this.settings.customColours(), this.appearance.ownAccent()).map(
      (colour): ThemePickerOption => ({
        value: colour,
        label: colour,
        theme: THEME_CUSTOM,
        base,
        accent: CUSTOM_ACCENT_OWN,
        tokens: { ...customAccentTokens(colour, base, background) },
        ...this.removable(colour),
      }),
    );
    return [...curated, ...own];
  });

  /** The curated backgrounds of the base, then the own colours (#335) drawn in their readable shade. */
  protected readonly backgroundOptions = computed<ThemePickerOption[]>(() => {
    const base = this.theme.customTheme().base;
    const curated = this.labels(CUSTOM_THEME_BACKGROUNDS[base], `${KEY}.custom.background`).map(
      (option) => ({ ...option, theme: THEME_CUSTOM, base, background: option.value }),
    );
    const own = this.withChosen(this.settings.customColours(), this.appearance.ownBackground()).map(
      (colour): ThemePickerOption => ({
        value: colour,
        label: colour,
        theme: THEME_CUSTOM,
        base,
        background: CUSTOM_BACKGROUND_OWN,
        tokens: { ...customBackgroundTokens(colour, base) },
        ...this.removable(colour),
      }),
    );
    return [...curated, ...own];
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

  /**
   * The remove action of an own swatch (#350): only for colours the account lists. The colour the
   * theme wears but the account does not list keeps its swatch (it is in use).
   */
  private removable(colour: string): Pick<ThemePickerOption, 'removeLabel'> {
    activeLang();
    return isHexColour(colour) && this.settings.customColours().includes(colour)
      ? { removeLabel: this.ownColours.removeLabel(colour) }
      : {};
  }

  /** The own colours, with the chosen one added when the account does not list it (yet). */
  private withChosen(colours: readonly string[], chosen: string | null): string[] {
    return chosen === null || colours.includes(chosen) ? [...colours] : [...colours, chosen];
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

  /** Options labelled by `<prefix>.<value>` (recomputed when the translations load). */
  private labels(values: readonly string[], prefix: string): { value: string; label: string }[] {
    this.translation();
    return values.map((value) => ({
      value,
      label: this.transloco.translate(`${prefix}.${value}`),
    }));
  }
}
