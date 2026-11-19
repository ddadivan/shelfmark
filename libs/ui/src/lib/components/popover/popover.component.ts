import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import type { ConnectedOverlay } from '../../services/overlay/connected-overlay';
import { UiOverlay } from '../../services/overlay/overlay.service';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';
import { KEYBOARD_KEY } from '../../models/keyboard';
import type { PopoverCloseOptions } from './models/popover-close-options.interface';
import type { PopoverOpenOptions } from './models/popover-open-options.interface';
import { popoverPositions } from './popover-positions';

let nextPopoverId = 0;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A small glass panel above a trigger with a heading and projected content, such as the list
 * of all tags of a card (`role="dialog"`, named by its `heading`). Non-modal: the page stays
 * usable, nothing is trapped.
 *
 * Open it with `uiPopoverTrigger` on the trigger (hover, keyboard focus, click or tap), or in
 * code with `openFrom(element, { focus })`. Esc closes it and gives focus back to the trigger; a
 * press outside closes it; Tab past either end of its content closes it and continues from the
 * trigger. `hovered` tells the trigger the pointer is over the panel, so it stays open.
 *
 * The overlay (layer `menu`) prefers the space above the trigger and flips below it; the panel
 * grows from the corner next to the trigger (`--ui-origin`). Closed, the host is hidden and
 * empty. It lives in `<body>`, so it takes the theme of `<html>`.
 *
 * `inline` renders the panel in place and always open, without overlay or trigger (docs and
 * Storybook only).
 */
@Component({
  selector: 'ui-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-popover',
    role: 'dialog',
    '[class.ui-popover--shown]': 'inline() || attached()',
    '[class.ui-popover--inline]': 'inline()',
    '[attr.id]': 'id',
    '[attr.aria-labelledby]': 'headingId',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
    '(pointerenter)': 'hoveredState.set(true)',
    '(pointerleave)': 'hoveredState.set(false)',
  },
  templateUrl: './popover.component.html',
  styleUrl: './popover.component.scss',
})
export class PopoverComponent {
  /** The visible title, also the accessible name of the dialog ("All tags"). */
  readonly heading = input.required<string>();
  /** Render in place, always open (docs and Storybook). */
  readonly inline = input(false, { transform: booleanAttribute });

  /** The popover opened. */
  readonly opened = output<void>();
  /** The popover closed (Esc, a press outside, Tab out, the trigger or `close()`). */
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly overlays = inject(UiOverlay);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  /** `id` of the dialog, for `aria-controls` on a trigger. */
  readonly id = `ui-popover-${++nextPopoverId}`;
  protected readonly headingId = `${this.id}-heading`;

  private readonly open = signal(false);
  /** The host sits in an overlay pane (open, or still leaving). */
  protected readonly attached = signal(false);
  protected readonly hoveredState = signal(false);
  private readonly anchorElement = signal<HTMLElement | null>(null);

  /** Whether the panel is shown. */
  readonly isOpen = this.open.asReadonly();
  protected readonly rendered = computed(() => this.inline() || this.open());
  /** The element the popover is open on; `null` when closed. */
  readonly anchor = this.anchorElement.asReadonly();
  /** The pointer is over the panel. */
  readonly hovered = this.hoveredState.asReadonly();

  private overlay: ConnectedOverlay | null = null;
  private overlayOrigin: HTMLElement | null = null;
  private detachSubscription: Subscription | null = null;
  private listening = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.disarm();
      this.attached.set(false);
      this.disposeOverlay();
      // Angular may have detached the host before this runs; the CDK dispose can put it back.
      this.host.remove();
    });
  }

  /** Focus is inside the panel. */
  containsFocus(): boolean {
    const active = this.document.activeElement;
    return active !== null && this.host.contains(active);
  }

  /** Opens above (or below, when there is no room) an element, normally the trigger. */
  openFrom(origin: HTMLElement, options: PopoverOpenOptions = {}): void {
    if (this.inline()) {
      return;
    }
    const wasOpen = this.open();
    if (this.overlay?.isAttached && origin === this.overlayOrigin) {
      // Reopened on the same trigger while the leave animation runs.
      this.overlay.cancelRelease();
    } else {
      this.disposeOverlay();
      this.createOverlay(origin);
    }
    this.anchorElement.set(origin);
    this.attached.set(true);
    this.open.set(true);
    this.arm();
    if (!wasOpen) {
      this.opened.emit();
    }
    if (options.focus) {
      afterNextRender(
        () => {
          this.focusFirst();
        },
        { injector: this.injector },
      );
    }
  }

  /** Moves focus to the first control of the panel (the panel itself when it has none). */
  focusFirst(): void {
    if (!this.open()) {
      return;
    }
    const first = this.focusables()[0];
    if (first) {
      first.focus();
    } else {
      const surface = this.host.querySelector<HTMLElement>('.ui-popover__surface');
      surface?.setAttribute('tabindex', '-1');
      surface?.focus();
    }
  }

  /** Closes the popover (see `PopoverCloseOptions.restoreFocus`). */
  close(options: PopoverCloseOptions = {}): void {
    if (!this.open()) {
      return;
    }
    const restore = options.restoreFocus ?? this.containsFocus();
    const target = this.anchorElement();
    this.open.set(false);
    this.hoveredState.set(false);
    this.anchorElement.set(null);
    this.disarm();
    this.overlay?.release();
    if (restore && target?.isConnected) {
      target.focus();
    }
    this.closed.emit();
  }

  private createOverlay(origin: HTMLElement): void {
    const overlay = this.overlays.connect(
      { origin, positions: popoverPositions(), layer: OVERLAY_LAYER.Menu },
      { injector: this.injector },
    );
    this.overlay = overlay;
    this.overlayOrigin = origin;
    overlay.attachElement(this.host);
    this.detachSubscription = overlay.detachments().subscribe(() => {
      if (this.overlay === overlay) {
        this.disposeOverlay();
        this.disarm();
        this.attached.set(false);
        if (this.open()) {
          // Detached from outside (not through `close()`): no listener may outlive the pane.
          this.open.set(false);
          this.anchorElement.set(null);
        }
      }
    });
  }

  private disposeOverlay(): void {
    this.detachSubscription?.unsubscribe();
    this.detachSubscription = null;
    const overlay = this.overlay;
    this.overlay = null;
    this.overlayOrigin = null;
    overlay?.dispose();
  }

  private focusables(): HTMLElement[] {
    return [...this.host.querySelectorAll<HTMLElement>(FOCUSABLE)];
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== KEYBOARD_KEY.Tab) {
      return;
    }
    const items = this.focusables();
    const active = this.document.activeElement;
    const leavesStart = event.shiftKey && (items.length === 0 || active === items[0]);
    const leavesEnd = !event.shiftKey && (items.length === 0 || active === items.at(-1));
    if (leavesStart) {
      // Back to the trigger itself.
      event.preventDefault();
      this.close({ restoreFocus: true });
    } else if (leavesEnd) {
      // Focus goes back to the trigger first, so the browser's Tab moves on from there.
      this.close({ restoreFocus: true });
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!this.open() || !(next instanceof Node)) {
      return;
    }
    if (!this.host.contains(next) && !this.anchorElement()?.contains(next)) {
      this.close({ restoreFocus: false });
    }
  }

  /** Esc closes from the trigger too (a popover opened by hover or focus has no focus inside). */
  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== KEYBOARD_KEY.Escape || !this.open()) {
      return;
    }
    const active = this.document.activeElement;
    const anchor = this.anchorElement();
    const ours = active !== null && (this.host.contains(active) || !!anchor?.contains(active));
    if (ours) {
      // A dialog around the trigger keeps its own Esc.
      event.stopPropagation();
    }
    this.close({ restoreFocus: ours });
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    // A press on the trigger is its own click: it toggles the popover.
    if (this.host.contains(target) || this.anchorElement()?.contains(target)) {
      return;
    }
    this.close({ restoreFocus: false });
  };

  private arm(): void {
    if (!this.listening) {
      this.listening = true;
      this.document.addEventListener('pointerdown', this.onPointerDown, true);
      this.document.addEventListener('keydown', this.onDocumentKeydown, true);
    }
  }

  private disarm(): void {
    if (this.listening) {
      this.listening = false;
      this.document.removeEventListener('pointerdown', this.onPointerDown, true);
      this.document.removeEventListener('keydown', this.onDocumentKeydown, true);
    }
  }
}
