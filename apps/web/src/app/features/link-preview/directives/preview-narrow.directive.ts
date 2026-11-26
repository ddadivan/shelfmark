import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * Says whether its host (the preview panel) is narrower than `appPreviewNarrowBelow` rem, the same
 * line its stylesheet draws with a container query (round 11): the toolbar then hides Wider and
 * Details, and the ⋯ menu offers them instead. A `ResizeObserver` follows the window and the resize
 * handle; nothing runs without one.
 */
@Directive({
  selector: '[appPreviewNarrow]',
  exportAs: 'previewNarrow',
})
export class PreviewNarrowDirective {
  /** The width, in rem of the root font size, below which the host counts as narrow. */
  readonly below = input(30, { alias: 'appPreviewNarrowBelow' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly narrowNow = signal(false);
  /** True while the host is narrower than `below`. */
  readonly narrow = this.narrowNow.asReadonly();

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const view = this.host.ownerDocument.defaultView;
      if (!view || typeof view.ResizeObserver === 'undefined') {
        return;
      }
      const observer = new view.ResizeObserver(() => this.measure());
      observer.observe(this.host);
      this.measure();
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private measure(): void {
    const doc = this.host.ownerDocument;
    const rem =
      parseFloat(doc.defaultView?.getComputedStyle(doc.documentElement).fontSize ?? '') || 16;
    this.narrowNow.set(this.host.getBoundingClientRect().width < this.below() * rem);
  }
}
