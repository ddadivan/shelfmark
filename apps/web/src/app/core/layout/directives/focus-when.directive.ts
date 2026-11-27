import {
  afterNextRender,
  booleanAttribute,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
} from '@angular/core';
import { UI_FOCUS_TARGET } from '@shelfmark/ui';

const FOCUSABLE = 'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])';
const NATIVE_FOCUSABLE = /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/;

/**
 * Moves focus to the host once the next render is done, every time `appFocusWhen` becomes true
 * (a host that is created while it is already true takes focus on its first render, like an
 * autofocus). It replaces `viewChild` + `afterNextRender` + `focus()` + a stored `Injector`.
 *
 * What is focused: the `UI_FOCUS_TARGET` of the host (`ui-button`, `ui-chip`), else the host
 * itself when it is focusable (a native control or an element with a `tabindex`), else the first
 * focusable element inside it (`ui-input`, `ui-textarea`, `ui-checkbox`).
 */
@Directive({ selector: '[appFocusWhen]' })
export class FocusWhenDirective {
  /** Focus when this becomes true. */
  readonly appFocusWhen = input(false, { transform: booleanAttribute });
  /** Do not scroll the focused element into view. */
  readonly appFocusWhenPreventScroll = input(false, { transform: booleanAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly target = inject(UI_FOCUS_TARGET, { optional: true, self: true });
  private readonly injector = inject(Injector);

  constructor() {
    let was = false;
    effect(() => {
      const now = this.appFocusWhen();
      if (now && !was) {
        const options: FocusOptions = { preventScroll: this.appFocusWhenPreventScroll() };
        afterNextRender(() => this.focus(options), { injector: this.injector });
      }
      was = now;
    });
  }

  private focus(options: FocusOptions): void {
    if (this.target) {
      this.target.focus(options);
      return;
    }
    const focusable =
      NATIVE_FOCUSABLE.test(this.host.tagName) || this.host.hasAttribute('tabindex')
        ? this.host
        : this.host.querySelector<HTMLElement>(FOCUSABLE);
    (focusable ?? this.host).focus(options);
  }
}
