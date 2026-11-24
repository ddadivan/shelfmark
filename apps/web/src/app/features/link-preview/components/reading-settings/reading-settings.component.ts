import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  PopoverComponent,
  READER_FONT,
  READER_LINE_WIDTH,
  READER_TEXT_SIZE,
  READER_TONE,
  SegmentedControlComponent,
  type ReaderFont,
  type ReaderLineWidth,
  type ReaderTextSize,
  type ReaderTone,
  type SegmentedOption,
} from '@shelfmark/ui';
import { PreviewReaderService } from '../../services/preview-reader.service';

/**
 * The Reading settings popover of Reader (Shelf `01-library.html`): text size S / M / L, font Sans /
 * Serif / Readable, line width Narrow / Wide and page Like the app / Sepia. Each choice applies at
 * once. The Aa button of the toolbar opens it through `[uiPopoverTrigger]="settings.popover()"`.
 */
@Component({
  selector: 'app-reading-settings',
  imports: [TranslocoPipe, PopoverComponent, SegmentedControlComponent],
  templateUrl: './reading-settings.component.html',
  styleUrl: './reading-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingSettingsComponent {
  protected readonly reader = inject(PreviewReaderService);
  private readonly transloco = inject(TranslocoService);
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });
  /** The popover, for the trigger. */
  readonly popover = viewChild.required(PopoverComponent);

  private options(group: string, values: readonly string[]): SegmentedOption[] {
    this.i18n();
    return values.map((value) => ({
      value,
      label: this.transloco.translate(`preview.reading.${group}.${value}`),
    }));
  }

  protected readonly sizes = computed(() => this.options('size', Object.values(READER_TEXT_SIZE)));
  protected readonly fonts = computed(() => this.options('font', Object.values(READER_FONT)));
  protected readonly widths = computed(() =>
    this.options('width', Object.values(READER_LINE_WIDTH)),
  );
  protected readonly tones = computed(() => this.options('tone', Object.values(READER_TONE)));

  protected setSize(size: string): void {
    this.reader.setSettings({ size: size as ReaderTextSize });
  }

  protected setFont(font: string): void {
    this.reader.setSettings({ font: font as ReaderFont });
  }

  protected setWidth(width: string): void {
    this.reader.setSettings({ width: width as ReaderLineWidth });
  }

  protected setTone(tone: string): void {
    this.reader.setSettings({ tone: tone as ReaderTone });
  }
}
