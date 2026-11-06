import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, effect, ElementRef, inject, input } from '@angular/core';

import { UI_RIPPLE_IGNORE } from './models/ui-ripple-ignore.const';

const MOVE_CANCEL_DISTANCE = 10;
const FADE_ANIMATION = 'ui-ripple-fade';

/** `[uiRipple]="false"` (or the string `'false'`) opts out; anything else keeps it on. */
function enabledTransform(value: boolean | string | null | undefined): boolean {
  return value !== false && value !== 'false';
}

/**
 * Press feedback: a circle of `currentColor` grows from the touch point and fades on release
 * (docs/design/components/Ripple/README.md). Works on any host: it adds `ui-ripple-host`
 * (positioned, clipped) and appends an `aria-hidden` span that is removed when its fade ends.
 * Enter / Space start it from the centre; a pointer that moves more than 10 px (a scroll)
 * cancels it. No ripple when the host is `disabled` / `aria-disabled="true"`, when opted out,
 * or under `prefers-reduced-motion: reduce` (the host shows its pressed background instead).
 * Styles are global (`ripple` mixin in `global.scss`); the span is created at runtime.
 */
@Directive({
  selector: '[uiRipple]',
  host: {
    '[class.ui-ripple-host]': 'enabled()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'release()',
    '(pointercancel)': 'release()',
    '(pointerleave)': 'release()',
    '(keydown)': 'onKeyDown($event)',
    '(keyup)': 'onKeyUp($event)',
    '(blur)': 'releaseKey()',
  },
})
export class RippleDirective {
  readonly enabled = input(true, { alias: 'uiRipple', transform: enabledTransform });
  /**
   * CSS selector of regions inside the host that never start a ripple: events whose target is
   * in a matching element are skipped, without stopping them from bubbling (a row's trailing
   * controls, whose own press must not ripple the row).
   */
  readonly ignore = input<string>('', { alias: 'uiRippleIgnore' });

  private readonly ignoreToken = inject(UI_RIPPLE_IGNORE, { optional: true, self: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly spans = new Set<HTMLElement>();
  private pointerRipple: HTMLElement | null = null;
  private keyRipple: HTMLElement | null = null;
  private pointerOrigin: { x: number; y: number } | null = null;

  constructor() {
    // Opted out or disabled while ripples run: the host loses `overflow: hidden`, so end them.
    effect(() => {
      if (!this.enabled()) {
        this.release();
        this.releaseKey();
        this.removeAll();
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.removeAll();
    });
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.isIgnored(event)) {
      return;
    }
    // Only the primary button; a second finger or right click does not ripple.
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    this.release();
    this.pointerOrigin = { x: event.clientX, y: event.clientY };
    this.pointerRipple = this.start(event.clientX, event.clientY);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.pointerRipple || !this.pointerOrigin) {
      return;
    }
    const distance = Math.hypot(
      event.clientX - this.pointerOrigin.x,
      event.clientY - this.pointerOrigin.y,
    );
    if (distance > MOVE_CANCEL_DISTANCE) {
      this.release();
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.isIgnored(event)) {
      return;
    }
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }
    // Space does not activate a link, so it gets no feedback.
    if (event.key === ' ' && this.host.tagName === 'A') {
      return;
    }
    this.releaseKey();
    const rect = this.host.getBoundingClientRect();
    this.keyRipple = this.start(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  protected onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.releaseKey();
    }
  }

  /** Fades the pointer ripple (pointer up, cancel, leave or a scroll-sized move). */
  protected release(): void {
    this.fade(this.pointerRipple);
    this.pointerRipple = null;
    this.pointerOrigin = null;
  }

  protected releaseKey(): void {
    this.fade(this.keyRipple);
    this.keyRipple = null;
  }

  private start(clientX: number, clientY: number): HTMLElement | null {
    if (!this.enabled() || this.isDisabled() || this.prefersReducedMotion()) {
      return null;
    }
    const rect = this.host.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    // Radius to the farthest corner, so the circle always covers the whole host.
    const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
    const span = this.document.createElement('span');
    span.className = 'ui-ripple';
    span.setAttribute('aria-hidden', 'true');
    // CSSOM writes, not a `style` attribute: allowed by a strict `style-src`.
    span.style.setProperty('width', `${radius * 2}px`);
    span.style.setProperty('height', `${radius * 2}px`);
    span.style.setProperty('left', `${x - radius}px`);
    span.style.setProperty('top', `${y - radius}px`);
    span.addEventListener('animationend', (event) => {
      if ((event as AnimationEvent).animationName === FADE_ANIMATION) {
        this.remove(span);
      }
    });
    this.host.append(span);
    this.spans.add(span);
    return span;
  }

  private fade(span: HTMLElement | null): void {
    if (!span) {
      return;
    }
    if (this.prefersReducedMotion()) {
      // The ripple is hidden (no animation), so `animationend` would never remove it.
      this.remove(span);
      return;
    }
    span.classList.add('is-out');
  }

  private remove(span: HTMLElement): void {
    span.remove();
    this.spans.delete(span);
  }

  private removeAll(): void {
    for (const span of this.spans) {
      span.remove();
    }
    this.spans.clear();
  }

  private isIgnored(event: Event): boolean {
    const selector = this.ignore() || this.ignoreToken;
    return !!selector && event.target instanceof Element && !!event.target.closest(selector);
  }

  private isDisabled(): boolean {
    const host = this.host as HTMLElement & { disabled?: boolean };
    return host.disabled === true || host.getAttribute('aria-disabled') === 'true';
  }

  private prefersReducedMotion(): boolean {
    return (
      this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    );
  }
}
