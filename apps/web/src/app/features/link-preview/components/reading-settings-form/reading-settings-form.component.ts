import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ButtonComponent,
  ICON_SIZE,
  RangeComponent,
  READER_FONT,
  READER_LINE_SPACING,
  READER_LINE_WIDTH,
  READER_TEXT_SIZE,
  READER_THEME,
  ReaderThemePickerComponent,
  SegmentedControlComponent,
  type ReaderFont,
  type ReaderLineSpacing,
  type ReaderLineWidth,
  type ReaderTheme,
  type ReaderThemeOption,
  type SegmentedOption,
} from '@shelfmark/ui';
import { ThemeService } from '../../../../core/theme/theme.service';
import { ReaderSettingsService } from '../../../reader/services/reader-settings.service';
import { READER_FONT_FAMILY } from './models/reader-font-family.const';

let nextFormId = 0;

/**
 * The content of Reading settings (Shelf ReaderView): Theme (four tiles; until one is picked the
 * tile of the app theme is checked), Font (each label in its own font), Text size (A, a slider
 * 14 to 24px, A, the value), Line spacing, Line width, then "Saved to your account" and Reset.
 * Each change applies at once through `ReaderSettingsService` (root), so the popover and the
 * phone sheet share it.
 */
@Component({
  selector: 'app-reading-settings-form',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    RangeComponent,
    ReaderThemePickerComponent,
    SegmentedControlComponent,
  ],
  templateUrl: './reading-settings-form.component.html',
  styleUrl: './reading-settings-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingSettingsFormComponent {
  private readonly readerSettings = inject(ReaderSettingsService);
  private readonly theme = inject(ThemeService);
  private readonly transloco = inject(TranslocoService);
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly SIZE = READER_TEXT_SIZE;
  protected readonly settings = this.readerSettings.settings;
  protected readonly ids = {
    theme: `reading-theme-${++nextFormId}`,
    font: `reading-font-${nextFormId}`,
    size: `reading-size-${nextFormId}`,
    spacing: `reading-spacing-${nextFormId}`,
    width: `reading-width-${nextFormId}`,
  };

  /** The tile shown as checked: the chosen theme, else the app's (Light or Dark). */
  protected readonly shownTheme = computed<ReaderTheme>(
    () => this.settings().theme ?? this.theme.resolved(),
  );

  private label(key: string): string {
    this.i18n();
    return this.transloco.translate(key);
  }

  protected readonly themes = computed<ReaderThemeOption[]>(() =>
    Object.values(READER_THEME).map((value) => ({
      value,
      label: this.label(`preview.reading.theme.${value}`),
    })),
  );
  protected readonly fonts = computed<SegmentedOption[]>(() =>
    Object.values(READER_FONT).map((value) => ({
      value,
      label: this.label(`preview.reading.font.${value}`),
      font: READER_FONT_FAMILY[value],
    })),
  );
  protected readonly spacings = computed<SegmentedOption[]>(() =>
    Object.values(READER_LINE_SPACING).map((value) => ({
      value,
      label: this.label(`preview.reading.spacing.${value}`),
    })),
  );
  protected readonly widths = computed<SegmentedOption[]>(() =>
    Object.values(READER_LINE_WIDTH).map((value) => ({
      value,
      label: this.label(`preview.reading.width.${value}`),
    })),
  );
  /** Spoken value of the slider ("18 px"). */
  protected readonly sizeText = computed(() => {
    this.i18n();
    return this.transloco.translate('preview.reading.size.value', {
      size: String(this.settings().size),
    });
  });

  protected setTheme(theme: string): void {
    this.readerSettings.set({ theme: theme as ReaderTheme });
  }

  protected setFont(font: string): void {
    this.readerSettings.set({ font: font as ReaderFont });
  }

  protected setSize(size: number): void {
    this.readerSettings.set({ size });
  }

  protected stepSize(step: -1 | 1): void {
    this.readerSettings.stepSize(step);
  }

  protected setSpacing(spacing: string): void {
    this.readerSettings.set({ lineSpacing: spacing as ReaderLineSpacing });
  }

  protected setWidth(width: string): void {
    this.readerSettings.set({ width: width as ReaderLineWidth });
  }

  protected reset(): void {
    this.readerSettings.reset();
  }
}
