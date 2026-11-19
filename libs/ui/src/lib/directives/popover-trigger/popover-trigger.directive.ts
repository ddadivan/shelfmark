import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
  untracked,
} from '@angular/core';
import { UI_FOCUS_TARGET } from '../focus-target/models/ui-focus-target.const';
import type { PopoverComponent } from '../../components/popover/popover.component';
import { BUTTON_HASPOPUP } from '../../components/button/models/button-haspopup.const';
import { POINTER_TYPE } from '../long-press/models/pointer-type.const';
import { POPOVER_DELAY_MS } from './models/popover-delay-ms.const';

/**
 * Opens a `ui-popover` from a trigger. Put it on a `<ui-button>` or a clickable `<ui-chip>`: it
 * reaches the inner native button through `UI_FOCUS_TARGET`, so the listeners,
 * `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls` sit on the element that has
 * focus; on any other host it uses the host element.
 *
 * - Hover (mouse and pen) and keyboard focus open it after `POPOVER_DELAY_MS.Open` without moving
 *   focus; it closes `POPOVER_DELAY_MS.Close` after the pointer and focus left both the trigger
 *   and the panel, so the pointer can move into the panel. `uiPopoverTriggerHover="false"` turns
 *   this off (click only).
 * - A click or tap (touch never hovers) pins it open; a keyboard activation (Enter, Space) also
 *   moves focus into the panel. A second click closes it. Esc and a press outside close it (see
 *   `ui-popover`).
 */
@Directive({
  selector: '[uiPopoverTrigger]',
  exportAs: 'uiPopoverTrigger',
})
export class PopoverTriggerDirective {
  /** The popover to open. */
  readonly popover = input.required<PopoverComponent>({ alias: 'uiPopoverTrigger' });
  /** Opens on hover and keyboard focus too, not only on click. */
  readonly hover = input(true, { alias: 'uiPopoverTriggerHover', transform: booleanAttribute });

  private readonly focusTarget = inject(UI_FOCUS_TARGET, { optional: true, self: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);

  private readonly target = computed(() =>
    this.focusTarget ? this.focusTarget.element() : this.host,
  );

  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private hovered = false;
  private focused = false;
  /** Opened by a click or tap: only Esc, a press outside or another click close it. */
  private pinned = false;

  constructor() {
    effect((onCleanup) => {
      const target = this.target();
      if (!target) {
        return;
      }
      const unlisten = [
        this.renderer.listen(target, 'click', (event: MouseEvent) => {
          this.onClick(event, target);
        }),
        this.renderer.listen(target, 'pointerenter', (event: PointerEvent) => {
          this.onPointerEnter(event, target);
        }),
        this.renderer.listen(target, 'pointerleave', () => {
          this.hovered = false;
          this.requestClose();
        }),
        this.renderer.listen(target, 'focus', () => {
          this.onFocus(target);
        }),
        this.renderer.listen(target, 'blur', () => {
          this.focused = false;
          this.requestClose();
        }),
      ];
      onCleanup(() => {
        unlisten.forEach((fn) => {
          fn();
        });
      });
    });

    effect((onCleanup) => {
      const target = this.target();
      if (!target) {
        return;
      }
      const popover = this.popover();
      this.renderer.setAttribute(target, 'aria-haspopup', BUTTON_HASPOPUP.Dialog);
      this.renderer.setAttribute(target, 'aria-expanded', String(popover.anchor() === target));
      this.renderer.setAttribute(target, 'aria-controls', popover.id);
      onCleanup(() => {
        this.renderer.removeAttribute(target, 'aria-haspopup');
        this.renderer.removeAttribute(target, 'aria-expanded');
        this.renderer.removeAttribute(target, 'aria-controls');
      });
    });

    // The pointer over the panel keeps it open; leaving it starts the close delay.
    effect(() => {
      const over = this.popover().hovered();
      untracked(() => {
        if (over) {
          clearTimeout(this.closeTimer);
        } else {
          this.requestClose();
        }
      });
    });

    // Closed by the popover itself (Esc, outside press, Tab out): the next open starts fresh.
    effect(() => {
      if (!this.popover().isOpen()) {
        untracked(() => {
          this.pinned = false;
          this.clearTimers();
        });
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.clearTimers();
    });
  }

  private onClick(event: MouseEvent, target: HTMLElement): void {
    const popover = this.popover();
    clearTimeout(this.openTimer);
    if (popover.anchor() === target && this.pinned) {
      popover.close();
      return;
    }
    // `detail` is 0 for a keyboard activation: focus moves into the panel.
    const keyboard = event.detail === 0;
    this.pinned = true;
    if (popover.anchor() === target) {
      if (keyboard) {
        popover.focusFirst();
      }
      return;
    }
    popover.openFrom(target, { focus: keyboard });
  }

  private onPointerEnter(event: PointerEvent, target: HTMLElement): void {
    if (event.pointerType === POINTER_TYPE.Touch || !this.hover()) {
      return;
    }
    this.hovered = true;
    this.requestOpen(target);
  }

  private onFocus(target: HTMLElement): void {
    if (!this.hover() || !this.isKeyboardFocus(target)) {
      return;
    }
    this.focused = true;
    this.requestOpen(target);
  }

  private requestOpen(target: HTMLElement): void {
    clearTimeout(this.closeTimer);
    const popover = this.popover();
    if (popover.anchor() === target || this.openTimer !== undefined) {
      return;
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = undefined;
      if (this.hovered || this.focused) {
        this.popover().openFrom(target);
      }
    }, POPOVER_DELAY_MS.Open);
  }

  private requestClose(): void {
    clearTimeout(this.closeTimer);
    if (!this.hovered && !this.focused) {
      clearTimeout(this.openTimer);
      this.openTimer = undefined;
    }
    const popover = this.popover();
    if (this.pinned || !popover.isOpen()) {
      return;
    }
    this.closeTimer = setTimeout(() => {
      const current = this.popover();
      if (!this.pinned && !this.hovered && !this.focused && !current.hovered()) {
        if (!current.containsFocus()) {
          current.close({ restoreFocus: false });
        }
      }
    }, POPOVER_DELAY_MS.Close);
  }

  private clearTimers(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.openTimer = undefined;
    this.closeTimer = undefined;
  }

  /** Mouse focus on a button is not `:focus-visible`; hover covers it. */
  private isKeyboardFocus(target: HTMLElement): boolean {
    try {
      return target.matches(':focus-visible');
    } catch {
      return true;
    }
  }
}
