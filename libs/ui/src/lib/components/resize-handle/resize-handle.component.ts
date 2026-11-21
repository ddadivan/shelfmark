import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { OVERLAY_SIDE } from '../../services/overlay/models/overlay-side.const';
import type { ResizeHandleLimits } from './models/resize-handle-limits.interface';
import { clampResizeValue, dragResizeValue, keyResizeValue } from './resize-handle-value';

/**
 * A vertical separator between two panes that the user drags (or moves with the keyboard) to
 * change the width of the pane before it. `value` is that width in px; the owner applies it.
 *
 * `role="separator"` with `aria-valuenow|min|max`, named by `label`. Pointer drag uses pointer
 * capture and emits clamped values while moving; ArrowLeft / ArrowRight move 16px (Shift 64px),
 * Home / End jump to `min` / `max`, Enter or a double click emits `resetRequested` (the owner restores
 * its default width). While dragging, the page shows `col-resize` and no text is selected. The
 * grip pill is always visible so the control is discoverable; `hint` adds a tooltip.
 */
@Component({
  selector: 'ui-resize-handle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TooltipDirective],
  templateUrl: './resize-handle.component.html',
  styleUrl: './resize-handle.component.scss',
})
export class ResizeHandleComponent {
  protected readonly OVERLAY_SIDE = OVERLAY_SIDE;

  /** Accessible name, for example "Resize the preview panel". */
  readonly label = input.required<string>();
  /** Width in px of the pane before the handle. */
  readonly value = model(0);
  /** Smallest value in px. */
  readonly min = input(0, { transform: numberAttribute });
  /** Largest value in px. */
  readonly max = input(1000, { transform: numberAttribute });
  /** Optional tooltip (and description), for example "Drag or use the arrow keys to resize". */
  readonly hint = input('');

  /** Enter or a double click: the owner restores its default value. */
  readonly resetRequested = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly body = inject(DOCUMENT).body;
  private drag: { pointerId: number; startX: number; startValue: number } | null = null;

  protected readonly dragging = signal(false);
  protected readonly now = computed(() => clampResizeValue(this.value(), this.min(), this.max()));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.endDrag());
  }

  private limits(): ResizeHandleLimits {
    return {
      min: this.min(),
      max: this.max(),
      rtl: getComputedStyle(this.host).direction === 'rtl',
    };
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    this.drag = { pointerId: event.pointerId, startX: event.clientX, startValue: this.now() };
    this.dragging.set(true);
    this.body.style.setProperty('cursor', 'col-resize');
    this.body.style.setProperty('user-select', 'none');
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }
    this.value.set(dragResizeValue(drag.startValue, drag.startX, event.clientX, this.limits()));
  }

  protected onPointerEnd(event: PointerEvent): void {
    if (this.drag?.pointerId === event.pointerId) {
      this.endDrag();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === KEYBOARD_KEY.Enter) {
      event.preventDefault();
      this.resetRequested.emit();
      return;
    }
    const next = keyResizeValue(event.key, this.now(), event.shiftKey, this.limits());
    if (next !== null) {
      event.preventDefault();
      this.value.set(next);
    }
  }

  private endDrag(): void {
    this.drag = null;
    this.dragging.set(false);
    this.body.style.removeProperty('cursor');
    this.body.style.removeProperty('user-select');
  }
}
