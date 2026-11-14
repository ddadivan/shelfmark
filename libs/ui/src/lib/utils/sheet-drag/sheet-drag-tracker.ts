import type { DragState } from './models/drag-state.interface';
import { SHEET_DRAG_PROPERTY } from './models/sheet-drag-property.const';
import type { SheetDragEnd } from './models/sheet-drag-end.type';
import { SHEET_DRAG_END } from './models/sheet-drag-end.const';
import { SHEET_SAMPLES } from './models/sheet-samples.const';
import { sheetVelocity, shouldCloseSheet } from './sheet-drag';

/** Controls inside a drag handle that keep their own pointer behaviour. */
export const SHEET_NO_DRAG_TARGETS = 'button, a, input, select, textarea, [contenteditable]';

/**
 * One bottom sheet's grip drag (the dialog sheet and the emoji picker sheet): the sheet follows
 * the finger through `--ui-sheet-drag` (CSSOM, no `style` attribute) and the release decides
 * (`shouldCloseSheet`: past 30% of the height or a flick). The owner checks whether a drag may
 * start, adds the `snapping` transition after a snap back and closes on `close`.
 */
export class SheetDragTracker {
  private drag: DragState | undefined;

  /** A drag is in progress. */
  get active(): boolean {
    return this.drag !== undefined;
  }

  /** Starts a drag for a primary press outside the handle's controls; false when it did not. */
  start(event: PointerEvent): boolean {
    const target = event.target;
    if (
      this.drag ||
      (event.pointerType === 'mouse' && event.button !== 0) ||
      (target instanceof Element && target.closest(SHEET_NO_DRAG_TARGETS))
    ) {
      return false;
    }
    this.drag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      samples: [{ y: event.clientY, time: event.timeStamp }],
      offset: 0,
    };
    if (event.currentTarget instanceof Element) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    return true;
  }

  /** Follows the finger (downwards only) on `sheet`. */
  move(event: PointerEvent, sheet: HTMLElement): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    drag.samples.push({ y: event.clientY, time: event.timeStamp });
    if (drag.samples.length > SHEET_SAMPLES) {
      drag.samples.shift();
    }
    drag.offset = Math.max(0, event.clientY - drag.startY);
    setSheetOffset(sheet, drag.offset);
  }

  /**
   * The release: `close` (the leave animation starts from the dragged position, so the offset
   * stays) or `snap` (the offset goes back to 0); `null` for another pointer.
   */
  end(event: PointerEvent, sheet: HTMLElement): SheetDragEnd | null {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return null;
    }
    this.drag = undefined;
    const height = sheet.getBoundingClientRect().height;
    if (shouldCloseSheet(drag.offset, height, sheetVelocity(drag.samples, event.timeStamp))) {
      return SHEET_DRAG_END.Close;
    }
    setSheetOffset(sheet, 0);
    return SHEET_DRAG_END.Snap;
  }

  /** A cancelled pointer snaps back; true when it ended this drag. */
  cancel(event: PointerEvent, sheet: HTMLElement): boolean {
    if (!this.drag || event.pointerId !== this.drag.pointerId) {
      return false;
    }
    this.drag = undefined;
    setSheetOffset(sheet, 0);
    return true;
  }
}

/** Writes the drag offset as a custom property through the CSSOM (the strict CSP stays happy). */
export function setSheetOffset(sheet: HTMLElement, pixels: number): void {
  sheet.style.setProperty(SHEET_DRAG_PROPERTY, `${pixels}px`);
}
