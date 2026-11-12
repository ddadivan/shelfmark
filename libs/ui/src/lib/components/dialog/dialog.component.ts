import {
  booleanAttribute,
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { nextDialogId } from '../../services/dialog/dialog-id';
import { UiDialogRef } from '../../services/dialog/dialog-ref';
import { PHONE_MEDIA_QUERY } from '../../utils/media';
import type { DialogSize } from './models/dialog-size.type';
import { SHEET_HEIGHT } from '../sheet/models/sheet-height.const';
import type { SheetHeight } from '../sheet/models/sheet-height.type';
import { UI_DIALOG_CONTEXT } from './models/ui-dialog-context.const';
import type { DragState } from './models/drag-state.interface';
import { SHEET_SAMPLES } from './models/sheet-samples.const';
import { shouldCloseSheet, sheetVelocity } from './sheet-drag';
import { DIALOG_SIZE } from './models/dialog-size.const';
import { DIALOG_VARIANT } from './models/dialog-variant.const';
import type { DialogVariant } from './models/dialog-variant.type';
import { BUTTON_SIZE } from '../button/models/button-size.const';

const DRAG_PROPERTY = '--ui-sheet-drag';
const NO_DRAG_TARGETS = 'button, a, input, select, textarea, [contenteditable]';

/**
 * Layout of a dialog: title, optional close button, body (default slot) and footer
 * (`slot="footer"`; the secondary action first, the main action last). Opened through
 * `DialogService`, whose content component renders it; it also works on its own for docs.
 *
 * Below 40em it is a bottom sheet with a grip: the header follows the finger, a release past
 * 30% of the height or a fast downward flick closes it, anything else snaps back. Keyboard users
 * close it with Esc or the close / Cancel buttons. Under `prefers-reduced-motion` dialog and
 * sheet only fade; the drag still works.
 *
 * The title, size and result wiring come from `DialogService` when it is used; `size` set here
 * wins over the one in the open options.
 */
@Component({
  selector: 'ui-dialog',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-dialog-host',
    // `title` is an input here: keep the browser from showing it as a native tooltip.
    '[attr.title]': 'null',
  },
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
})
export class DialogComponent {
  /** Heading of the dialog; it names it for assistive technology. */
  readonly title = input.required<string>();
  /**
   * The content shows its own visible heading (the welcome steps put it under an illustration):
   * the title stays in the DOM as the accessible name, visually hidden. The sheet grip stays.
   */
  readonly hideTitle = input(false, { transform: booleanAttribute });
  /** `sm` (440px) or `md` (560px); default from the open options, else `sm`. */
  readonly size = input<DialogSize>();
  /** Accessible name of the close button in the header. Without it there is no close button. */
  readonly closeLabel = input<string>();
  /**
   * Below 40em the panel fills the whole screen instead of being a bottom sheet: no grip, no
   * rounded corners, no drag to close (the close button and Esc still close it). For full-screen
   * tasks such as search, where the keyboard takes half the screen.
   */
  readonly phoneFullscreen = input(false, { transform: booleanAttribute });

  /**
   * Set by `ui-sheet`: the content is a sheet. Below 40em it gets the 28px top corners, the
   * 150px strip of the page above it and, with `tall`, the full height under that strip; on
   * larger screens it stays a centred dialog. Unset: a plain dialog.
   */
  readonly sheetHeight = input<SheetHeight>();

  /**
   * `command` draws the top-placed glass panel of the search overlay (see `UiDialogConfig.variant`);
   * set here it wins over the open options, which is how docs render a static panel. The placement
   * itself (96px from the top) belongs to the service, so a static panel only gets the look.
   */
  readonly variant = input<DialogVariant>();

  /** The close button was used or the sheet was dragged shut. */
  readonly closeRequested = output<void>();

  private readonly context = inject(UI_DIALOG_CONTEXT, { optional: true });
  private readonly ref = inject<UiDialogRef<unknown>>(UiDialogRef, { optional: true });
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');

  protected readonly titleId = this.context?.titleId ?? nextDialogId('ui-dialog-title');
  protected readonly DIALOG_SIZE = DIALOG_SIZE;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly SHEET_HEIGHT = SHEET_HEIGHT;
  protected readonly effectiveSize = computed(
    () => this.size() ?? this.context?.size ?? DIALOG_SIZE.Sm,
  );
  protected readonly command = computed(
    () => (this.variant() ?? this.context?.variant) === DIALOG_VARIANT.Command,
  );
  protected readonly leaving = computed(() => this.context?.leaving() ?? false);
  protected readonly phone = signal(false);
  protected readonly dragging = signal(false);
  protected readonly snapping = signal(false);
  /** The body overflows: it becomes a focusable region so the keyboard can scroll it. */
  protected readonly scrollable = signal(false);

  private drag: DragState | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const query = globalThis.matchMedia?.(PHONE_MEDIA_QUERY);
      if (query) {
        this.phone.set(query.matches);
        const onChange = (event: MediaQueryListEvent): void => {
          this.phone.set(event.matches);
        };
        query.addEventListener('change', onChange);
        destroyRef.onDestroy(() => {
          query.removeEventListener('change', onChange);
        });
      }
      if (typeof ResizeObserver !== 'undefined') {
        const body = this.body().nativeElement;
        const observer = new ResizeObserver(() => {
          this.scrollable.set(body.scrollHeight > body.clientHeight + 1);
        });
        observer.observe(body);
        destroyRef.onDestroy(() => {
          observer.disconnect();
        });
      }
    });
  }

  protected requestClose(): void {
    this.closeRequested.emit();
    this.ref?.close();
  }

  protected onPointerDown(event: PointerEvent): void {
    const target = event.target;
    if (
      !this.phone() ||
      this.phoneFullscreen() ||
      this.leaving() ||
      this.drag ||
      (event.pointerType === 'mouse' && event.button !== 0) ||
      (target instanceof Element && target.closest(NO_DRAG_TARGETS))
    ) {
      return;
    }
    this.drag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      samples: [{ y: event.clientY, time: event.timeStamp }],
      offset: 0,
    };
    this.snapping.set(false);
    this.dragging.set(true);
    if (event.currentTarget instanceof Element) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    drag.samples.push({ y: event.clientY, time: event.timeStamp });
    if (drag.samples.length > SHEET_SAMPLES) {
      drag.samples.shift();
    }
    drag.offset = Math.max(0, event.clientY - drag.startY);
    this.setOffset(drag.offset);
  }

  protected onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    this.drag = undefined;
    this.dragging.set(false);
    const height = this.panel().nativeElement.getBoundingClientRect().height;
    if (shouldCloseSheet(drag.offset, height, sheetVelocity(drag.samples, event.timeStamp))) {
      // The leave animation starts from the dragged position (`--ui-sheet-drag` stays set).
      this.requestClose();
    } else {
      this.snapBack();
    }
  }

  protected onPointerCancel(event: PointerEvent): void {
    if (this.drag && event.pointerId === this.drag.pointerId) {
      this.drag = undefined;
      this.dragging.set(false);
      this.snapBack();
    }
  }

  private snapBack(): void {
    this.snapping.set(true);
    this.setOffset(0);
  }

  private setOffset(pixels: number): void {
    // A custom property through the CSSOM: no `style` attribute, so the strict CSP stays happy.
    this.panel().nativeElement.style.setProperty(DRAG_PROPERTY, `${pixels}px`);
  }
}
