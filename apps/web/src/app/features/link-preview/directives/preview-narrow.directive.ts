import { Directive, ElementRef, computed, inject, input } from '@angular/core';
import { UiResizeDirective } from '@shelfmark/ui';

/**
 * Says whether its host (the preview panel) is narrower than `appPreviewNarrowBelow` rem, the same
 * line its stylesheet draws with a container query (round 11): the toolbar then hides Wider and
 * Details, and the ⋯ menu offers them instead. The width comes from `uiResize` (a
 * `ResizeObserver` that follows the window and the resize handle; nothing runs without one).
 */
@Directive({
  selector: '[appPreviewNarrow]',
  exportAs: 'previewNarrow',
  hostDirectives: [UiResizeDirective],
})
export class PreviewNarrowDirective {
  /** The width, in rem of the root font size, below which the host counts as narrow. */
  readonly below = input(35, { alias: 'appPreviewNarrowBelow' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly resize = inject(UiResizeDirective);
  /** True while the host is narrower than `below`. */
  readonly narrow = computed(() => {
    const size = this.resize.size();
    if (size === undefined) {
      return false;
    }
    const doc = this.host.ownerDocument;
    const rem =
      parseFloat(doc.defaultView?.getComputedStyle(doc.documentElement).fontSize ?? '') || 16;
    return size.width < this.below() * rem;
  });
}
