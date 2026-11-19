import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  numberAttribute,
  signal,
  viewChild,
} from '@angular/core';
import { DRAWER_SIDE } from './models/drawer-side.const';
import type { DrawerSide } from './models/drawer-side.type';
import { DRAWER_WIDTH } from './models/drawer-width.const';
import type { DrawerWidth } from './models/drawer-width.type';
import { ButtonComponent } from '../button/button.component';
import { BUTTON_SIZE } from '../button/models/button-size.const';
import { UiDialogRef } from '../../services/dialog/dialog-ref';
import { mediaMatch } from '../../utils/media/media-match';
import { clampDrawerWidth, drawerKeyWidth, drawerMaxWidth } from './drawer-resize';
import { DRAWER_RESIZE } from './models/drawer-resize.const';

/**
 * Layout of a side drawer: a header (`slot="head"`, for example the logo) with a close button,
 * a scrolling body (default slot) and a footer (`slot="foot"`). Pinned to the inline-start
 * edge, full viewport height, `min(19.5rem, 100vw - 3rem)` wide (`width="wide"`: 27.5rem, a
 * 440px panel), with safe-area padding.
 * Opened through `DrawerService`, whose content component renders it; it also works on its own
 * for docs. It slides in from the inline-start edge and out again (a fade under
 * `prefers-reduced-motion`).
 *
 * `resizable` (#521, from 64em only): a handle on the edge towards the page (`role="separator"`,
 * named by `resizeLabel`, `aria-valuenow|min|max`) drags the width between `minWidth` and
 * `min(maxWidth, 70vw)`; ArrowLeft / ArrowRight move it 40px, Home / End jump to the limits, a
 * double click goes back to the default. `size` (px, `null` = default) is a model, so the feature
 * keeps the choice. The width never animates.
 */
@Component({
  selector: 'ui-drawer',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-drawer-host' },
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.scss',
})
export class DrawerComponent {
  /** Accessible name of the close button, for example "Close menu". */
  readonly closeLabel = input.required<string>();

  /** The edge the drawer is pinned to: decides where it slides in from. */
  readonly side = input<DrawerSide>(DRAWER_SIDE.Start);

  /** `narrow` (the phone menu) or `wide` (a 440px panel such as Ask your shelf). */
  readonly width = input<DrawerWidth>(DRAWER_WIDTH.Narrow);

  /** The width can be dragged (from 64em; phones and tablets keep the full-screen panel). */
  readonly resizable = input(false, { transform: booleanAttribute });

  /** Accessible name of the resize handle, for example "Resize the panel". */
  readonly resizeLabel = input('');

  /** Narrowest width in px while resizable. */
  readonly minWidth = input<number, unknown>(DRAWER_RESIZE.MinWidth, {
    transform: numberAttribute,
  });

  /** Widest width in px while resizable (also never more than 70% of the window). */
  readonly maxWidth = input<number, unknown>(DRAWER_RESIZE.MaxWidth, {
    transform: numberAttribute,
  });

  /** The chosen width in px, `null` for the default; set by dragging or the keyboard. */
  readonly size = model<number | null>(null);

  private readonly ref = inject<UiDialogRef<unknown>>(UiDialogRef, { optional: true });
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly viewport = signal(typeof window === 'undefined' ? 0 : window.innerWidth);
  private readonly desktop = mediaMatch(DRAWER_RESIZE.MediaQuery);
  private drag: { pointerId: number; startX: number; startWidth: number } | null = null;

  /** The handle shows: resizable and wide enough. */
  protected readonly canResize = computed(() => this.resizable() && this.desktop());
  protected readonly maxNow = computed(() =>
    drawerMaxWidth(this.minWidth(), this.maxWidth(), this.viewport()),
  );
  /** The width in force (the default is the minimum, today's 440px panel). */
  protected readonly current = computed(() =>
    clampDrawerWidth(this.size() ?? this.minWidth(), this.minWidth(), this.maxNow()),
  );

  protected readonly DRAWER_SIDE = DRAWER_SIDE;
  protected readonly DRAWER_WIDTH = DRAWER_WIDTH;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly leaving = computed(() => this.ref?.leaving() ?? false);

  constructor() {
    if (typeof window !== 'undefined') {
      const onResize = () => this.viewport.set(window.innerWidth);
      window.addEventListener('resize', onResize);
      inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', onResize));
    }
    // The width goes on the panel through the CSSOM (no style attribute under the strict CSP).
    effect(() => {
      const panel = this.panel()?.nativeElement;
      if (!panel) {
        return;
      }
      if (this.canResize() && this.size() !== null) {
        panel.style.setProperty('--ui-drawer-size', `${this.current()}px`);
      } else {
        panel.style.removeProperty('--ui-drawer-size');
      }
    });
  }

  protected requestClose(): void {
    this.ref?.close();
  }

  /** An end drawer in ltr (or a start drawer in rtl) grows when its handle moves left. */
  private growsTowardsLeft(): boolean {
    const panel = this.panel()?.nativeElement;
    const rtl = panel ? getComputedStyle(panel).direction === 'rtl' : false;
    return (this.side() === DRAWER_SIDE.End) !== rtl;
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.canResize() || event.button !== 0) {
      return;
    }
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    this.drag = { pointerId: event.pointerId, startX: event.clientX, startWidth: this.current() };
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }
    const delta = (drag.startX - event.clientX) * (this.growsTowardsLeft() ? 1 : -1);
    this.size.set(clampDrawerWidth(drag.startWidth + delta, this.minWidth(), this.maxNow()));
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.drag?.pointerId === event.pointerId) {
      this.drag = null;
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const next = drawerKeyWidth(event.key, this.current(), {
      min: this.minWidth(),
      max: this.maxNow(),
      growsTowardsLeft: this.growsTowardsLeft(),
    });
    if (next === null) {
      return;
    }
    event.preventDefault();
    this.size.set(next);
  }

  /** Double click: back to the default width. */
  protected reset(): void {
    this.size.set(null);
  }
}
