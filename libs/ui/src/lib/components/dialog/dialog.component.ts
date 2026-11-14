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
import { COMPACT_MEDIA_QUERY, PHONE_MEDIA_QUERY } from '../../utils/media';
import type { DialogSize } from './models/dialog-size.type';
import { SHEET_HEIGHT } from '../sheet/models/sheet-height.const';
import type { SheetHeight } from '../sheet/models/sheet-height.type';
import { UI_DIALOG_CONTEXT } from './models/ui-dialog-context.const';
import { SHEET_DRAG_END, SheetDragTracker } from '../../utils/sheet-drag';
import { DIALOG_SIZE } from './models/dialog-size.const';
import { DIALOG_VARIANT } from './models/dialog-variant.const';
import type { DialogVariant } from './models/dialog-variant.type';
import { BUTTON_SIZE } from '../button/models/button-size.const';

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
  styleUrls: ['./dialog.component.scss', './dialog-motion.scss', './dialog-parts.scss'],
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
  /** The content holds the dialog open (`UiDialogRef.setLocked`): no close button, no drag. */
  protected readonly locked = computed(() => this.ref?.locked() ?? false);
  protected readonly phone = signal(false);
  /** Below 64em (#316): a `ui-sheet` stays a bottom sheet on a tablet too (centred, 560px). */
  protected readonly compact = signal(false);
  /** The panel is a bottom sheet you can drag down: every dialog on a phone, a sheet below 64em. */
  protected readonly sheetMode = computed(
    () => this.phone() || (this.sheetHeight() !== undefined && this.compact()),
  );
  protected readonly dragging = signal(false);
  protected readonly snapping = signal(false);
  /** The body overflows: it becomes a focusable region so the keyboard can scroll it. */
  protected readonly scrollable = signal(false);

  private readonly drag = new SheetDragTracker();

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      for (const [media, state] of [
        [PHONE_MEDIA_QUERY, this.phone],
        [COMPACT_MEDIA_QUERY, this.compact],
      ] as const) {
        const query = globalThis.matchMedia?.(media);
        if (query) {
          state.set(query.matches);
          const onChange = (event: MediaQueryListEvent): void => {
            state.set(event.matches);
          };
          query.addEventListener('change', onChange);
          destroyRef.onDestroy(() => {
            query.removeEventListener('change', onChange);
          });
        }
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
    if (this.locked()) {
      return;
    }
    this.closeRequested.emit();
    this.ref?.close();
  }

  protected onPointerDown(event: PointerEvent): void {
    if (
      !this.sheetMode() ||
      this.phoneFullscreen() ||
      this.leaving() ||
      this.locked() ||
      !this.drag.start(event)
    ) {
      return;
    }
    this.snapping.set(false);
    this.dragging.set(true);
  }

  protected onPointerMove(event: PointerEvent): void {
    this.drag.move(event, this.panel().nativeElement);
  }

  protected onPointerUp(event: PointerEvent): void {
    const end = this.drag.end(event, this.panel().nativeElement);
    if (end === null) {
      return;
    }
    this.dragging.set(false);
    if (end === SHEET_DRAG_END.Close) {
      // The leave animation starts from the dragged position (`--ui-sheet-drag` stays set).
      this.requestClose();
    } else {
      this.snapping.set(true);
    }
  }

  protected onPointerCancel(event: PointerEvent): void {
    if (this.drag.cancel(event, this.panel().nativeElement)) {
      this.dragging.set(false);
      this.snapping.set(true);
    }
  }
}
