import {
  afterRenderEffect,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * Fits the tag chips of a card footer on its one line (#512). The host is the list: its `li[data-tag]`
 * children are the chips (all rendered, the ones that do not fit are taken out of the flow by the
 * template through `visible`), and `li[data-more]` is the "+N" chip, which stays measurable even
 * while it is off. After each render, and when the host or a chip changes size (a font swap, a
 * resized card), it counts how many whole chips fit next to the "+N" chip. Nothing is cut mid-word:
 * only when not even the first chip fits does `clipFirst` ask for it to be cut with an ellipsis.
 * `measured` turns true after the first measure (the template keeps the list hidden until then, so
 * the footer never jumps). A host without a width (hidden by a card setting) shows every chip.
 *
 * `appFitTags` is the number of rendered chips.
 */
@Directive({
  selector: '[appFitTags]',
  exportAs: 'appFitTags',
})
export class FitTagsDirective {
  /** How many tag chips are rendered. */
  readonly total = input.required<number>({ alias: 'appFitTags' });

  private readonly fit = signal<number | null>(null);
  private readonly clip = signal(false);

  /** How many chips show (all of them until the first measure). */
  readonly visible = computed(() => Math.min(this.fit() ?? this.total(), this.total()));
  /** How many rendered chips are left out; the "+N" chip shows when it is above zero. */
  readonly hidden = computed(() => this.total() - this.visible());
  /** The first chip alone is wider than the line: cut it with an ellipsis. */
  readonly clipFirst = this.clip.asReadonly();
  readonly measured = computed(() => this.fit() !== null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private lastKey = '';

  constructor() {
    afterRenderEffect(() => {
      this.total();
      this.measure();
    });

    const observerType = globalThis.ResizeObserver as typeof ResizeObserver | undefined;
    if (observerType !== undefined) {
      const observer = new observerType(() => this.measure());
      observer.observe(this.host);
      // Chips change size without the host doing so (a web font arrives): watch them too.
      afterRenderEffect(() => {
        this.total();
        observer.disconnect();
        observer.observe(this.host);
        this.host.querySelectorAll('li[data-tag], li[data-more]').forEach((item) => {
          observer.observe(item);
        });
      });
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }
  }

  private measure(): void {
    const available = this.host.clientWidth;
    if (available === 0) {
      this.fit.set(this.total());
      this.clip.set(false);
      return;
    }
    const tags = [...this.host.querySelectorAll<HTMLElement>('li[data-tag]')];
    const moreWidth = this.host.querySelector<HTMLElement>('li[data-more]')?.offsetWidth ?? 0;
    // `scrollWidth` too: a clipped or capped chip still reports the width of its whole text.
    const widths = tags.map((tag) => Math.max(tag.offsetWidth, tag.scrollWidth));
    const key = `${available}|${moreWidth}|${widths.join(',')}`;
    if (key === this.lastKey && this.fit() !== null) {
      return;
    }
    this.lastKey = key;
    const gap = Number.parseFloat(getComputedStyle(this.host).columnGap) || 0;

    let used = 0;
    let fits = 0;
    for (const [index, width] of widths.entries()) {
      const next = used + (index > 0 ? gap : 0) + width;
      const reserve = index < widths.length - 1 ? gap + moreWidth : 0;
      if (next + reserve > available) {
        break;
      }
      used = next;
      fits = index + 1;
    }
    const clipFirst = fits === 0 && widths.length > 0;
    this.clip.set(clipFirst);
    this.fit.set(clipFirst ? 1 : fits);
  }
}
