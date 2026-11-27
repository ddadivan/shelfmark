import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject } from '@angular/core';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { DISMISS_REASON } from './models/dismiss-reason.const';
import type { DismissableOptions } from './models/dismissable-options.interface';

/**
 * Closes a floating layer on a press outside it and on Esc. One capture `pointerdown` and
 * `keydown` pair on the document, attached only between `arm()` and `disarm()` and always removed
 * on destroy. A plain class created in the owner's injection context rather than a template
 * directive: the layers (popover, view menu, emoji picker) move their content into a CDK pane,
 * the anchor changes per open, and they arm synchronously in `show()`.
 *
 * Esc stops propagation only while focus is inside the layer or its anchor, so a dialog around the
 * trigger keeps its own Esc; the owner gets `focusInside` to decide about returning focus.
 */
export class Dismissable {
  private readonly document = inject(DOCUMENT);
  private listening = false;

  constructor(private readonly options: DismissableOptions) {
    inject(DestroyRef).onDestroy(() => {
      this.disarm();
    });
  }

  /** The listeners are attached. */
  get armed(): boolean {
    return this.listening;
  }

  /** Starts listening (idempotent). */
  arm(): void {
    if (this.listening) {
      return;
    }
    this.listening = true;
    this.document.addEventListener('pointerdown', this.onPointerDown, true);
    if (this.options.escape !== false) {
      this.document.addEventListener('keydown', this.onKeydown, true);
    }
  }

  /** Stops listening (idempotent). */
  disarm(): void {
    if (!this.listening) {
      return;
    }
    this.listening = false;
    this.document.removeEventListener('pointerdown', this.onPointerDown, true);
    this.document.removeEventListener('keydown', this.onKeydown, true);
  }

  /** The node is inside the layer, its anchor, or an ignored region. */
  contains(node: Node): boolean {
    if (this.options.inside().some((element) => !!element?.contains(node))) {
      return true;
    }
    const selector = this.options.ignore;
    if (selector === undefined) {
      return false;
    }
    const element = node instanceof Element ? node : node.parentElement;
    return !!element?.closest(selector);
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== KEYBOARD_KEY.Escape) {
      return;
    }
    const active = this.document.activeElement;
    const focusInside =
      active !== null && this.options.inside().some((el) => !!el?.contains(active));
    if (focusInside) {
      event.stopPropagation();
    }
    this.options.dismissed({ reason: DISMISS_REASON.Escape, event, focusInside });
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Node) || this.contains(target)) {
      return;
    }
    this.options.dismissed({ reason: DISMISS_REASON.Pointer, event, focusInside: false });
  };
}
