import {
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
import { nextDialogId } from './dialog-id';
import { UiDialogRef } from './dialog-ref';
import { DIALOG_PHONE_QUERY } from './models/dialog-phone-query.const';
import type { DialogSize } from './models/dialog-size.type';
import { UI_DIALOG_CONTEXT } from './models/ui-dialog-context.const';
import type { DragState } from './models/drag-state.interface';
import { SHEET_SAMPLES } from './models/sheet-samples.const';
import { shouldCloseSheet, sheetVelocity } from './sheet-drag';

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
  /** `sm` (440px) or `md` (560px); default from the open options, else `sm`. */
  readonly size = input<DialogSize>();
  /** Accessible name of the close button in the header. Without it there is no close button. */
  readonly closeLabel = input<string>();

  /** The close button was used or the sheet was dragged shut. */
  readonly closeRequested = output<void>();

  private readonly context = inject(UI_DIALOG_CONTEXT, { optional: true });
  private readonly ref = inject<UiDialogRef<unknown>>(UiDialogRef, { optional: true });
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');

  protected readonly titleId = this.context?.titleId ?? nextDialogId('ui-dialog-title');
  protected readonly effectiveSize = computed(() => this.size() ?? this.context?.size ?? 'sm');
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
      const query = globalThis.matchMedia?.(DIALOG_PHONE_QUERY);
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
