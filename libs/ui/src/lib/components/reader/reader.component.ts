import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FaviconComponent } from '../favicon/favicon.component';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { READER_FONT } from './models/reader-font.const';
import type { ReaderFont } from './models/reader-font.type';
import { READER_LINE_WIDTH } from './models/reader-line-width.const';
import type { ReaderLineWidth } from './models/reader-line-width.type';
import { READER_TEXT_SIZE } from './models/reader-text-size.const';
import type { ReaderTextSize } from './models/reader-text-size.type';
import { READER_TONE } from './models/reader-tone.const';
import type { ReaderTone } from './models/reader-tone.type';
import { READER_VIEW_BLOCK } from './models/reader-block-kind.const';
import type { ReaderViewBlock } from './models/reader-view-block.interface';

/**
 * An article as clean text (Shelf ReaderView, the Reader mode of the Link page). The host is the
 * scroll area: a 2px progress line sticks to its top and `progressed` reports the share read
 * (0 to 1) as the person scrolls. Then an optional muted `notice`, the site with its favicon, the
 * title (`display` in the reading font), the `meta` line (author, date, reading time), the
 * `summary` slot, an optional `image` (the page's picture when it has no text), the `blocks`
 * (headings, paragraphs, lists, quotes, code, images with captions; plain text by interpolation,
 * never HTML) and the default slot (the note, an Open button).
 *
 * Reading settings come in as `size`, `font`, `width` and `tone` (sepia page); they only change
 * custom properties, so the text reflows in place. All text comes in through inputs.
 */
@Component({
  selector: 'ui-reader',
  imports: [FaviconComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-reader',
    '[attr.data-size]': 'size()',
    '[attr.data-font]': 'font()',
    '[attr.data-width]': 'width()',
    '[attr.data-tone]': 'tone()',
    '(scroll)': 'onScroll()',
  },
  templateUrl: './reader.component.html',
  styleUrl: './reader.component.scss',
})
export class ReaderComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly BLOCK = READER_VIEW_BLOCK;
  /** The site name above the title (`angular.dev`). */
  readonly site = input('');
  readonly faviconSrc = input<string>();
  readonly faviconLetter = input<string>();
  readonly faviconColour = input<string>();
  /** The article title. */
  readonly heading = input.required<string>();
  /** "Angular team · 2 Oct 2026 · 5 min read"; nothing when empty. */
  readonly meta = input('');
  /** One muted line above the article ("This page has no article text…"). */
  readonly notice = input('');
  /** A picture under the meta line (same-origin URL); decorative. */
  readonly image = input<string | null>(null);
  /** Aspect ratio of `image`, `16 / 9` by default. */
  readonly imageRatio = input('16 / 9');
  readonly blocks = input<readonly ReaderViewBlock[]>([]);
  readonly size = input<ReaderTextSize>(READER_TEXT_SIZE.M);
  readonly font = input<ReaderFont>(READER_FONT.Sans);
  readonly width = input<ReaderLineWidth>(READER_LINE_WIDTH.Narrow);
  readonly tone = input<ReaderTone>(READER_TONE.App);
  /** Share of the text scrolled past, 0 to 1 (at most once per frame). */
  readonly progressed = output<number>();

  protected readonly progress = signal(0);
  /** A picture that failed to load is left out. */
  protected readonly imageFailed = signal<string | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private frame = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }

  /** Back to the top (a new article). */
  scrollToStart(): void {
    this.host.nativeElement.scrollTop = 0;
    this.progress.set(0);
  }

  protected onScroll(): void {
    if (this.frame) {
      return;
    }
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const element = this.host.nativeElement;
      const room = element.scrollHeight - element.clientHeight;
      const share = room <= 0 ? 1 : Math.min(1, Math.max(0, element.scrollTop / room));
      this.progress.set(share);
      this.progressed.emit(share);
    });
  }

  protected onImageError(src: string): void {
    this.imageFailed.set(src);
  }
}
