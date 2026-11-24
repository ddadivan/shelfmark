import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { THEME } from '../../models/theme/models/theme.const';
import { FaviconComponent } from '../favicon/favicon.component';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { READER_FONT } from './models/reader-font.const';
import type { ReaderFont } from './models/reader-font.type';
import { READER_LINE_WIDTH } from './models/reader-line-width.const';
import type { ReaderLineWidth } from './models/reader-line-width.type';
import { READER_LINE_SPACING } from './models/reader-line-spacing.const';
import type { ReaderLineSpacing } from './models/reader-line-spacing.type';
import { READER_TEXT_SIZE } from './models/reader-text-size.const';
import { READER_THEME } from './models/reader-theme.const';
import type { ReaderTheme } from './models/reader-theme.type';
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
 * Reading settings come in as `textSize` (px, 14 to 24), `font`, `lineSpacing`, `width` and
 * `theme`; they only change custom properties, so the text reflows in place. A `theme` is a fixed
 * palette whatever the app theme: the host takes `data-theme` light or dark (the global token
 * rules then give every token inside, summary and note included, that theme's value) and
 * `data-reader-theme`, which swaps page, text and muted text for Sepia and Black. Without a theme
 * the reader follows the app. All text comes in through inputs.
 */
@Component({
  selector: 'ui-reader',
  imports: [FaviconComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-reader',
    '[style.--ui-reader-size]': 'sizeRem()',
    '[attr.data-font]': 'font()',
    '[attr.data-width]': 'width()',
    '[attr.data-spacing]': 'lineSpacing()',
    '[attr.data-theme]': 'baseTheme()',
    '[attr.data-reader-theme]': 'theme()',
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
  /** Body text size in px, clamped to 14 to 24 (18 by default). */
  readonly textSize = input<number>(READER_TEXT_SIZE.Default);
  readonly font = input<ReaderFont>(READER_FONT.Sans);
  readonly lineSpacing = input<ReaderLineSpacing>(READER_LINE_SPACING.Normal);
  readonly width = input<ReaderLineWidth>(READER_LINE_WIDTH.Normal);
  /** A fixed page palette, or `null` to follow the app theme. */
  readonly theme = input<ReaderTheme | null>(null);
  /** Share of the text scrolled past, 0 to 1 (at most once per frame). */
  readonly progressed = output<number>();

  protected readonly sizeRem = computed(() => {
    const size = Number.isFinite(this.textSize()) ? this.textSize() : READER_TEXT_SIZE.Default;
    const clamped = Math.min(READER_TEXT_SIZE.Max, Math.max(READER_TEXT_SIZE.Min, size));
    return `${clamped / 16}rem`;
  });
  /** The app theme whose tokens the fixed palette starts from. */
  protected readonly baseTheme = computed(() => {
    switch (this.theme()) {
      case READER_THEME.Light:
      case READER_THEME.Sepia:
        return THEME.Light;
      case READER_THEME.Dark:
      case READER_THEME.Black:
        return THEME.Dark;
      default:
        return null;
    }
  });

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
