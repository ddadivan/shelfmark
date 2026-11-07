import { DOCUMENT } from '@angular/common';
import {
  booleanAttribute,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import {
  LONG_PRESS_CLICK_GUARD_MS,
  LONG_PRESS_DURATION_MS,
  LONG_PRESS_MOVE_TOLERANCE_PX,
  LONG_PRESS_POINTER_TYPES,
} from './models/long-press.const';
import type { UiLongPressEvent } from './models/long-press-event.interface';

/**
 * Emits `uiLongPress` after a touch or pen stays down for 500 ms (iOS Safari fires no
 * `contextmenu` on a long press, so this is the touch route to a context menu). A mouse is
 * ignored (it has a right click) and so is the keyboard: consumers keep Shift+F10 and the menu
 * key. The press is cancelled by a move over 10 px, release, pointer cancel, or a scroll of the
 * page or any container. Only when it fired, the click that follows and the native context menu
 * (Android) are swallowed, so the menu does not open twice and the card is not activated.
 * The host gets `-webkit-touch-callout: none` (CSSOM, no style attribute) so iOS shows no
 * link preview during the hold.
 *
 * `<ui-card uiLongPress (uiLongPress)="menu.openAt({ x: $event.x, y: $event.y })">`
 */
@Directive({
  selector: '[uiLongPress]',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerEnd()',
    '(pointercancel)': 'onPointerEnd()',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class LongPressDirective {
  /** Emits once per hold, when the duration has passed. */
  readonly longPress = output<UiLongPressEvent>({ alias: 'uiLongPress' });
  /** Turns the gesture off (a disabled row). */
  readonly disabled = input(false, { alias: 'uiLongPressDisabled', transform: booleanAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private guardTimer: ReturnType<typeof setTimeout> | null = null;
  private origin: { x: number; y: number } | null = null;
  private fired = false;
  private readonly onScroll = (): void => this.cancel();

  constructor() {
    this.host.style.setProperty('-webkit-touch-callout', 'none');
    // Capture phase, so the swallow runs before the host's own (click) listeners.
    const onClick = (event: MouseEvent): void => this.onClick(event);
    this.host.addEventListener('click', onClick, { capture: true });
    inject(DestroyRef).onDestroy(() => {
      this.host.removeEventListener('click', onClick, { capture: true });
      this.cancel();
      this.clearGuard();
    });
  }

  protected onPointerDown(event: PointerEvent): void {
    this.cancel();
    this.clearGuard();
    this.fired = false;
    if (
      this.disabled() ||
      !event.isPrimary ||
      !LONG_PRESS_POINTER_TYPES.some((type) => type === event.pointerType)
    ) {
      return;
    }
    this.origin = { x: event.clientX, y: event.clientY };
    this.document.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
    this.timer = setTimeout(() => this.fire(), LONG_PRESS_DURATION_MS);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.origin) {
      return;
    }
    const moved = Math.hypot(event.clientX - this.origin.x, event.clientY - this.origin.y);
    if (moved > LONG_PRESS_MOVE_TOLERANCE_PX) {
      this.cancel();
    }
  }

  protected onPointerEnd(): void {
    this.cancel();
    if (this.fired) {
      // Keep swallowing the click (and a late contextmenu) for a moment after the release.
      this.clearGuard();
      this.guardTimer = setTimeout(() => {
        this.fired = false;
        this.guardTimer = null;
      }, LONG_PRESS_CLICK_GUARD_MS);
    }
  }

  protected onContextMenu(event: MouseEvent): void {
    if (this.fired) {
      event.preventDefault();
    }
  }

  private onClick(event: MouseEvent): void {
    if (this.fired) {
      this.fired = false;
      this.clearGuard();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  /** Stops a running press without emitting. */
  protected cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.document.removeEventListener('scroll', this.onScroll, { capture: true });
    this.origin = null;
  }

  private fire(): void {
    const origin = this.origin;
    this.timer = null;
    this.document.removeEventListener('scroll', this.onScroll, { capture: true });
    if (!origin) {
      return;
    }
    this.origin = null;
    this.fired = true;
    this.longPress.emit({ origin: this.host, x: origin.x, y: origin.y });
  }

  private clearGuard(): void {
    if (this.guardTimer !== null) {
      clearTimeout(this.guardTimer);
      this.guardTimer = null;
    }
  }
}
