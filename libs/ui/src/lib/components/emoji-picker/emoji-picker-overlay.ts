import { DOCUMENT } from '@angular/common';
import { afterNextRender, DestroyRef, inject, Injector, signal } from '@angular/core';
import type { Subscription } from 'rxjs';
import { menuPositions } from '../menu/menu-positions';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { MENU_ALIGN } from '../menu/models/menu-align.const';
import type { ConnectedOverlay } from '../../services/overlay/connected-overlay';
import { UiOverlay } from '../../services/overlay/overlay.service';
import { OVERLAY_EDGE } from '../../services/overlay/models/overlay-edge.const';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';
import { overlayLayerClass } from '../../services/overlay/overlay-layer';
import {
  lastInputWasPointer,
  returnFocus,
  trackInputModality,
} from '../../services/dialog/focus-return';
import { mediaMatch } from '../../utils/media/media-match';
import { PHONE_MEDIA_QUERY } from '../../utils/media/models/phone-media-query.const';
import { SHEET_DRAG_END, SheetDragTracker } from '../../utils/sheet-drag';
import type { EmojiPickerOverlayHost } from './models/emoji-picker-overlay-host.interface';

/** Tabbable stops of the open panel, in order (roving grids and tabs expose one each). */
const PANEL_STOPS = 'input, button:not([tabindex="-1"]), [tabindex="0"]';

/**
 * The open / close half of `ui-emoji-picker`: the `UiOverlay` pane (layer `menu`, anchored to the
 * field box; below 40em a full-width sheet at the bottom edge), focus on open (the search box, or
 * the panel on a phone so the keyboard stays closed) and on close (`returnFocus`: no ring after a
 * pointer, no tooltip), closing on a press or focus outside (a toast does not count), Tab leaving
 * the panel, and the phone sheet's grip drag (`SheetDragTracker`). Create it in the component's
 * injection context; it is disposed with the component.
 */
export class EmojiPickerOverlay {
  /** The panel is open. */
  readonly open = signal(false);
  /** The popup sits in the overlay pane (open, or still leaving). */
  readonly attached = signal(false);
  /** This open is the phone sheet. */
  readonly sheet = signal(false);
  /** The sheet snaps back after a short drag (only then its transform is animated). */
  readonly snapping = signal(false);

  private readonly overlays = inject(UiOverlay);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly phone = mediaMatch(PHONE_MEDIA_QUERY);
  private readonly drag = new SheetDragTracker();
  private overlay: ConnectedOverlay | null = null;
  private overlaySheet = false;
  private detachSubscription: Subscription | null = null;
  private openedByPointer = false;
  private readonly outsidePress = (event: Event): void => {
    if (event.target instanceof Node && !this.ownsOrIgnores(event.target)) {
      this.hide(false);
    }
  };

  constructor(private readonly host: EmojiPickerOverlayHost) {
    trackInputModality();
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('pointerdown', this.outsidePress, true);
      this.detachSubscription?.unsubscribe();
      this.overlay?.dispose();
      // The pane may still hold the popup element, which Angular no longer owns.
      this.host.popup().remove();
    });
  }

  /** Opens (a click on the field when `pointer`); `onOpened` runs once the panel is shown. */
  show(pointer: boolean): void {
    if (this.open()) {
      return;
    }
    this.openedByPointer = pointer || lastInputWasPointer();
    const sheet = this.phone();
    this.sheet.set(sheet);
    this.open.set(true);
    if (this.overlay?.isAttached && this.overlaySheet === sheet) {
      // Reopened while the leave animation runs.
      this.overlay.cancelRelease();
    } else {
      this.createOverlay(sheet);
    }
    this.attached.set(true);
    this.document.addEventListener('pointerdown', this.outsidePress, true);
    afterNextRender(
      () => {
        this.overlay?.updatePosition();
        // On a phone the keyboard would cover the sheet: focus the panel, not the search box.
        const panel = this.host.panel();
        (sheet ? panel : panel?.querySelector<HTMLElement>('input'))?.focus({
          preventScroll: true,
        });
      },
      { injector: this.injector },
    );
  }

  /** Closes; `restoreFocus` hands focus back to the field. Runs `onClosed` (the field's `touch`). */
  hide(restoreFocus: boolean): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.document.removeEventListener('pointerdown', this.outsidePress, true);
    if (restoreFocus) {
      returnFocus(this.host.field(), this.openedByPointer);
    }
    this.host.onClosed();
    // The content leaves in this render (its leave animation starts); release the pane after it.
    afterNextRender(() => this.overlay?.release(), { injector: this.injector });
  }

  /** Places the panel again (its content changed height). */
  updatePosition(): void {
    if (this.open()) {
      this.overlay?.updatePosition();
    }
  }

  /** Focus left the panel: closes unless it went to the field, the panel or a toast. */
  focusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && !this.ownsOrIgnores(next)) {
      this.hide(false);
    }
  }

  /**
   * Keys on the open panel. Esc closes (stopped, so a dialog around the picker keeps its own) and
   * returns true. Tab past the last stop (or Shift+Tab before the first) leaves through the field:
   * forward Tab moves on from it (the browser's default runs after the handler), Shift+Tab lands
   * on it.
   */
  keydown(event: KeyboardEvent): boolean {
    if (event.key === KEYBOARD_KEY.Escape) {
      event.preventDefault();
      event.stopPropagation();
      this.hide(true);
      return true;
    }
    if (event.key !== KEYBOARD_KEY.Tab) {
      return false;
    }
    const stops = [...(this.host.panel()?.querySelectorAll<HTMLElement>(PANEL_STOPS) ?? [])].filter(
      (element) => !element.closest('[inert]'),
    );
    const edge = event.shiftKey ? stops[0] : stops[stops.length - 1];
    if (event.target === edge || stops.length === 0) {
      if (event.shiftKey) {
        event.preventDefault();
      }
      this.hide(true);
    }
    return false;
  }

  /** The closed field lost focus to somewhere other than the panel: the field is touched. */
  isFieldBlur(event: FocusEvent): boolean {
    const next = event.relatedTarget;
    return !this.open() && !(next instanceof Node && this.host.popup().contains(next));
  }

  /** The grip or the head of the phone sheet is pressed: it follows the finger down. */
  dragStart(event: PointerEvent): void {
    if (this.sheet() && this.drag.start(event)) {
      this.snapping.set(false);
    }
  }

  dragMove(event: PointerEvent): void {
    const panel = this.host.panel();
    if (panel) {
      this.drag.move(event, panel);
    }
  }

  /** Past 30% of the height or a flick closes (from where it was dragged); else it snaps back. */
  dragEnd(event: PointerEvent): void {
    const panel = this.host.panel();
    const end = panel ? this.drag.end(event, panel) : null;
    if (end === SHEET_DRAG_END.Close) {
      this.hide(true);
    } else if (end === SHEET_DRAG_END.Snap) {
      this.snapping.set(true);
    }
  }

  dragCancel(event: PointerEvent): void {
    const panel = this.host.panel();
    if (panel && this.drag.cancel(event, panel)) {
      this.snapping.set(true);
    }
  }

  private createOverlay(sheet: boolean): void {
    this.detachSubscription?.unsubscribe();
    this.overlay?.dispose();
    const overlay = sheet
      ? this.overlays.global(
          { edge: OVERLAY_EDGE.Bottom, layer: OVERLAY_LAYER.Menu },
          { injector: this.injector },
        )
      : this.overlays.connect(
          {
            origin:
              this.host.element.querySelector<HTMLElement>('.ui-field__control') ??
              this.host.element,
            positions: menuPositions(MENU_ALIGN.Start),
            layer: OVERLAY_LAYER.Menu,
          },
          { injector: this.injector },
        );
    this.overlay = overlay;
    this.overlaySheet = sheet;
    overlay.attachElement(this.host.popup());
    this.detachSubscription = overlay.detachments().subscribe(() => {
      if (this.overlay === overlay) {
        this.attached.set(false);
        this.open.set(false);
      }
    });
  }

  /**
   * The node is the field, the panel, or a toast: a toast (the Undo after removing an own emoji)
   * belongs to what the person is doing here, so pressing it or focusing it keeps the panel open.
   */
  private ownsOrIgnores(node: Node): boolean {
    const element = node instanceof Element ? node : node.parentElement;
    return (
      this.host.element.contains(node) ||
      this.host.popup().contains(node) ||
      !!element?.closest(`.${overlayLayerClass(OVERLAY_LAYER.Toast)}`)
    );
  }
}
