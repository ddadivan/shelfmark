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
  model,
  numberAttribute,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import { KEYBOARD_KEY } from '../../models/keyboard';
import type { ConnectedOverlay } from '../../services/overlay/connected-overlay';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';
import { UiOverlay } from '../../services/overlay/overlay.service';
import { RangeComponent } from '../range/range.component';
import { SwitchComponent } from '../switch/switch.component';
import type { ViewMenuFieldChange } from './models/view-menu-field-change.interface';
import type { ViewMenuField } from './models/view-menu-field.interface';
import type { ViewMenuStepText } from './models/view-menu-step-text.type';
import { viewMenuPositions } from './view-menu-positions';

let nextId = 0;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The "View" button of a feed and its panel (ViewMenu spec): a secondary pill (label and a
 * chevron that turns up while open) that opens a floating panel (at least 240px) with the grid size (a
 * stepped `ui-range`, its step text and the Small / Large captions) and one `ui-switch` row per
 * field of what the cards show (Note, Hashtags, Folder, Date). Changes apply at once: `step` is a
 * model, `fieldChange` emits `{ id, checked }`; the caller owns the state and passes `fields`
 * back. Every visible string comes in through an input.
 *
 * The panel is a non-modal `role="dialog"` named by `label` (trigger: `aria-haspopup="dialog"`,
 * `aria-expanded`, `aria-controls`). It sits under the trigger, lined up with its end edge, in a
 * `UiOverlay` pane (layer `menu`). Esc closes it and returns focus to the trigger, a press outside
 * closes it, so does Tab past either end. A keyboard open moves focus to the slider. `gridDisabled`
 * turns the slider off (List view has no grid). `inline` renders the panel in place and always open
 * (docs and Storybook only).
 */
@Component({
  selector: 'ui-view-menu',
  imports: [RangeComponent, SwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-view-menu',
    '[class.ui-view-menu--open]': 'isOpen()',
    '[class.ui-view-menu--inline]': 'inline()',
    '(focusout)': 'onFocusOut($event)',
  },
  templateUrl: './view-menu.component.html',
  styleUrl: './view-menu.component.scss',
})
export class ViewMenuComponent {
  /** Text of the trigger and the name of the dialog ("View"). */
  readonly label = input.required<string>();
  /** Title of the grid-size block, also the name of the slider ("Grid size"). */
  readonly heading = input.required<string>();
  /** Number of grid steps (the slider runs from 1 to `steps`). */
  readonly steps = input(6, { transform: numberAttribute });
  /** The current grid step, 1-based. */
  readonly step = model(1);
  /** Caption of the step ("4 / 6"): a text, or a function of the step and the step count. */
  readonly stepText = input<ViewMenuStepText>();
  /** Caption under the slider's low end ("Small"). */
  readonly smallLabel = input('');
  /** Caption under the slider's high end ("Large"). */
  readonly largeLabel = input('');
  /** Turns the slider off (the List view has no grid). */
  readonly gridDisabled = input(false, { transform: booleanAttribute });
  /** Hides the slider block (a phone feed has two columns, so there is no grid size to set). */
  readonly gridHidden = input(false, { transform: booleanAttribute });
  /** The switches of what cards show. */
  readonly fields = input<readonly ViewMenuField[]>([]);
  /** Render the panel in place, always open (docs and Storybook). */
  readonly inline = input(false, { transform: booleanAttribute });

  /** A switch was flipped. */
  readonly fieldChange = output<ViewMenuFieldChange>();
  /** The panel opened. */
  readonly opened = output<void>();
  /** The panel closed (Esc, a press outside, Tab out, the trigger or `close()`). */
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly overlays = inject(UiOverlay);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  /** `id` of the dialog (`aria-controls` of the trigger). */
  readonly id = `ui-view-menu-${++nextId}`;

  private readonly open = signal(false);
  /** The panel element sits in an overlay pane (open, or still leaving). */
  protected readonly attached = signal(false);
  /** Whether the panel is shown. */
  readonly isOpen = computed(() => this.inline() || this.open());
  protected readonly expanded = this.open.asReadonly();

  protected readonly stepLabel = computed(() => {
    const text = this.stepText();
    const step = this.step();
    const steps = this.steps();
    if (text === undefined) {
      return `${step} / ${steps}`;
    }
    return typeof text === 'function' ? text(step, steps) : text;
  });

  private overlay: ConnectedOverlay | null = null;
  private detachSubscription: Subscription | null = null;
  private listening = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.disarm();
      this.attached.set(false);
      this.disposeOverlay();
      // Angular may have detached the panel before this runs; the CDK dispose can put it back.
      this.panel().nativeElement.remove();
    });
  }

  /** Opens the panel under the trigger. `focus` moves focus to its first control. */
  show(options: { focus?: boolean } = {}): void {
    if (this.inline()) {
      return;
    }
    const wasOpen = this.open();
    if (this.overlay?.isAttached) {
      // Reopened while the leave animation runs.
      this.overlay.cancelRelease();
    } else {
      this.disposeOverlay();
      this.createOverlay();
    }
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

  /** Closes the panel; focus goes back to the trigger when it was inside (or `restoreFocus`). */
  close(options: { restoreFocus?: boolean } = {}): void {
    if (!this.open()) {
      return;
    }
    const restore = options.restoreFocus ?? this.containsFocus();
    this.open.set(false);
    this.disarm();
    this.overlay?.release();
    const trigger = this.trigger().nativeElement;
    if (restore && trigger.isConnected) {
      trigger.focus();
    }
    this.closed.emit();
  }

  /** Focus is inside the panel. */
  containsFocus(): boolean {
    const active = this.document.activeElement;
    return active !== null && this.panel().nativeElement.contains(active);
  }

  /** Moves focus to the first control of the panel. */
  focusFirst(): void {
    this.focusables()[0]?.focus();
  }

  protected toggle(event: MouseEvent): void {
    if (this.open()) {
      this.close({ restoreFocus: false });
    } else {
      // `detail` 0 is a keyboard activation (Enter, Space): focus goes into the panel.
      this.show({ focus: event.detail === 0 });
    }
  }

  /** A switch changed (a press on its row flips it through the row's label). */
  protected change(field: ViewMenuField, checked: boolean): void {
    this.fieldChange.emit({ id: field.id, checked });
  }

  private createOverlay(): void {
    const overlay = this.overlays.connect(
      {
        origin: this.trigger().nativeElement,
        positions: viewMenuPositions(),
        layer: OVERLAY_LAYER.Menu,
      },
      { injector: this.injector },
    );
    this.overlay = overlay;
    overlay.attachElement(this.panel().nativeElement);
    this.detachSubscription = overlay.detachments().subscribe(() => {
      if (this.overlay === overlay) {
        this.disposeOverlay();
        this.disarm();
        this.attached.set(false);
        // Detached from outside (not through `close()`): no listener may outlive the pane.
        this.open.set(false);
      }
    });
  }

  private disposeOverlay(): void {
    this.detachSubscription?.unsubscribe();
    this.detachSubscription = null;
    const overlay = this.overlay;
    this.overlay = null;
    overlay?.dispose();
  }

  private focusables(): HTMLElement[] {
    return [...this.panel().nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)];
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== KEYBOARD_KEY.Tab || !this.open()) {
      return;
    }
    const items = this.focusables();
    const active = this.document.activeElement;
    if (!this.panel().nativeElement.contains(active)) {
      return;
    }
    const leavesStart = event.shiftKey && (items.length === 0 || active === items[0]);
    const leavesEnd = !event.shiftKey && (items.length === 0 || active === items.at(-1));
    if (leavesStart) {
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
    if (!this.panel().nativeElement.contains(next) && !this.host.contains(next)) {
      this.close({ restoreFocus: false });
    }
  }

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== KEYBOARD_KEY.Escape || !this.open()) {
      return;
    }
    const active = this.document.activeElement;
    const ours =
      active !== null &&
      (this.panel().nativeElement.contains(active) || this.host.contains(active));
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
    // A press on the trigger is its own click: it toggles the panel.
    if (
      this.panel().nativeElement.contains(target) ||
      this.trigger().nativeElement.contains(target)
    ) {
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
