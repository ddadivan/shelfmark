import { afterRenderEffect, Directive, ElementRef, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

/**
 * A section a URL fragment points to (`/privacy#ai`, `/settings/ai#ai-data`): sets the host's
 * `id` and, once the URL's fragment names it and the page above has settled (`fragmentReady`),
 * scrolls it into view a single time. The router's own anchor scrolling is off (#352), so the
 * scrolling column (or the document on public pages) is moved here.
 */
@Directive({
  selector: '[appFragmentTarget]',
  host: { '[id]': 'appFragmentTarget()' },
})
export class FragmentTargetDirective {
  /** The fragment (and the host's `id`). */
  readonly appFragmentTarget = input.required<string>();
  /** False while content above the target may still change height. */
  readonly fragmentReady = input(true);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const fragment = toSignal(inject(ActivatedRoute).fragment);
    let scrolled = false;
    afterRenderEffect(() => {
      if (!scrolled && this.fragmentReady() && fragment() === this.appFragmentTarget()) {
        scrolled = true;
        host.scrollIntoView({ block: 'start' });
      }
    });
  }
}
