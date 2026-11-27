import { booleanAttribute, Directive, input, output, signal } from '@angular/core';
import { SHEET_DRAG_END, SheetDragTracker } from '../../utils/sheet-drag';

/**
 * The grip drag of a bottom sheet, on its drag handle (the grip and the head): the `uiSheetDrag`
 * panel follows the finger down (`--ui-sheet-drag`), a release past 30% of its height or a flick
 * emits `closeRequested` (the offset stays, so the leave animation starts from there), anything
 * else snaps back (`snapping`). Controls inside the handle keep their own pointer behaviour.
 *
 * Read `dragging` / `snapping` through `exportAs` (`#drag="uiSheetDrag"`) for the panel's classes.
 */
@Directive({
  selector: '[uiSheetDrag]',
  exportAs: 'uiSheetDrag',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
  },
})
export class SheetDragDirective {
  /** The sheet panel that moves with the finger. */
  readonly panel = input.required<HTMLElement>({ alias: 'uiSheetDrag' });
  /** A drag may start (false: a plain dialog, a locked or leaving sheet). */
  readonly enabled = input(true, { alias: 'uiSheetDragEnabled', transform: booleanAttribute });

  /** The drag ended past the threshold: close the sheet. */
  readonly closeRequested = output<void>();

  private readonly draggingState = signal(false);
  private readonly snappingState = signal(false);
  /** A drag is in progress. */
  readonly dragging = this.draggingState.asReadonly();
  /** The sheet snaps back after a short drag (only then its transform is animated). */
  readonly snapping = this.snappingState.asReadonly();

  private readonly tracker = new SheetDragTracker();

  protected onPointerDown(event: PointerEvent): void {
    if (!this.enabled() || !this.tracker.start(event)) {
      return;
    }
    this.snappingState.set(false);
    this.draggingState.set(true);
  }

  protected onPointerMove(event: PointerEvent): void {
    this.tracker.move(event, this.panel());
  }

  protected onPointerUp(event: PointerEvent): void {
    const end = this.tracker.end(event, this.panel());
    if (end === null) {
      return;
    }
    this.draggingState.set(false);
    if (end === SHEET_DRAG_END.Close) {
      this.closeRequested.emit();
    } else {
      this.snappingState.set(true);
    }
  }

  protected onPointerCancel(event: PointerEvent): void {
    if (this.tracker.cancel(event, this.panel())) {
      this.draggingState.set(false);
      this.snappingState.set(true);
    }
  }
}
