import { Menu } from '@angular/aria/menu';
import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import type { ConnectedOverlay } from '../../services/overlay/connected-overlay';
import type { OverlayPoint } from '../../services/overlay/models/overlay-point.interface';
import { UiOverlay } from '../../services/overlay/overlay.service';
import { MenuItemComponent } from './menu-item/menu-item.component';
import { menuPositions, pointPositions } from './menu-positions';
import type { MenuAlign } from './models/menu-align.type';
import type { MenuCloseOptions } from './models/menu-close-options.interface';
import type { MenuFocusEdge } from './models/menu-focus-edge.type';
import type { MenuOpenOptions } from './models/menu-open-options.interface';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { MENU_FOCUS_EDGE } from './models/menu-focus-edge.const';
import { MENU_ALIGN } from './models/menu-align.const';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';

function isElement(origin: HTMLElement | OverlayPoint): origin is HTMLElement {
  return 'nodeType' in origin;
}

/**
 * A menu of actions for a link, folder or the account. The popup, arrow keys, Home / End,
 * Enter / Space and typeahead are Angular Aria's `ngMenu` (a host directive); the position is the
 * CDK overlay of `UiOverlay` (layer `menu`) and the menu grows from its trigger (`--ui-origin`).
 *
 * Open it with `uiMenuTrigger` on a button, or in code: `openFrom(element)` below an element,
 * `openAt({ x, y })` at a pointer position (context menu). Esc, Tab, a click outside or choosing
 * an item closes it; Esc and a choice give focus back to the trigger (or to the element that had
 * it when opened at a point). Closed, the host is hidden and empty.
 *
 * `inline` renders the menu in place and always open, without overlay or trigger (docs and
 * Storybook only).
 *
 * The overlay lives in `<body>`, so it takes the theme of `<html>`.
 */
@Component({
  selector: 'ui-menu',
  hostDirectives: [{ directive: Menu, inputs: ['typeaheadDelay'] }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-menu',
    '[class.ui-menu--shown]': 'shown()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  /** Lines the menu up with the left (`start`) or right (`end`) edge of the trigger. */
  readonly align = input<MenuAlign>(MENU_ALIGN.Start);
  /** Accessible name of the menu, for example "Link actions". */
  readonly ariaLabel = input<string>();
  /** Render in place, always open (docs and Storybook). */
  readonly inline = input(false, { transform: booleanAttribute });

  /** The menu opened. */
  readonly opened = output<void>();
  /** The menu closed (an item was chosen, Esc, outside click or `close()`). */
  readonly closed = output<void>();

  private readonly aria = inject<Menu<unknown>>(Menu);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly overlays = inject(UiOverlay);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly items = contentChildren(MenuItemComponent, { descendants: true });

  private readonly open = signal(false);
  /** The host sits in an overlay pane (open, or still leaving). */
  private readonly attached = signal(false);
  private readonly anchorElement = signal<HTMLElement | null>(null);

  /** `id` of the menu element, for `aria-controls` on a trigger. */
  readonly id = computed(() => this.aria.id());
  /** Whether the surface is shown. */
  readonly isOpen = computed(() => this.inline() || this.open());
  /** The element the menu is open on; `null` when closed or opened at a point. */
  readonly anchor = this.anchorElement.asReadonly();

  protected readonly shown = computed(() => this.inline() || this.attached());
  protected readonly atPoint = signal(false);

  private overlay: ConnectedOverlay | null = null;
  private overlayOrigin: HTMLElement | OverlayPoint | null = null;
  private overlayAlign: MenuAlign | null = null;
  private detachSubscription: Subscription | null = null;
  private restoreTarget: HTMLElement | null = null;
  private listening = false;

  constructor() {
    this.aria.itemSelected.subscribe(() => {
      this.onItemSelected();
    });
    inject(DestroyRef).onDestroy(() => {
      this.disarm();
      this.attached.set(false);
      this.disposeOverlay();
      // Angular may have detached the host (root of an embedded view) before this runs; the
      // CDK dispose can put it back, so remove it for good.
      this.host.remove();
    });
  }

  /** Opens below (or above, when there is no room) an element, normally the trigger. */
  openFrom(origin: HTMLElement, options: MenuOpenOptions = {}): void {
    this.show(origin, options.focus ?? MENU_FOCUS_EDGE.First);
  }

  /** Opens at a viewport point (client coordinates), for a context menu. */
  openAt(point: OverlayPoint, options: MenuOpenOptions = {}): void {
    this.show({ x: point.x, y: point.y }, options.focus ?? MENU_FOCUS_EDGE.First);
  }

  /** Closes the menu; focus goes back to the trigger unless `restoreFocus` is `false`. */
  close(options: MenuCloseOptions = {}): void {
    if (this.inline() || !this.open()) {
      return;
    }
    this.open.set(false);
    this.anchorElement.set(null);
    this.disarm();
    this.overlay?.release();
    const target = this.restoreTarget;
    this.restoreTarget = null;
    if ((options.restoreFocus ?? true) && target?.isConnected) {
      target.focus();
    }
    this.closed.emit();
  }

  private show(origin: HTMLElement | OverlayPoint, focus: MenuFocusEdge): void {
    if (this.inline()) {
      return;
    }
    const wasOpen = this.open();
    if (!wasOpen) {
      const active = this.document.activeElement;
      this.restoreTarget = isElement(origin)
        ? origin
        : active instanceof HTMLElement
          ? active
          : null;
    }
    if (
      this.overlay?.isAttached &&
      isElement(origin) &&
      origin === this.overlayOrigin &&
      this.align() === this.overlayAlign
    ) {
      // Reopened on the same trigger (same alignment) while the leave animation runs.
      this.overlay.cancelRelease();
    } else {
      this.disposeOverlay();
      this.createOverlay(origin);
    }
    this.atPoint.set(!isElement(origin));
    this.anchorElement.set(isElement(origin) ? origin : null);
    this.attached.set(true);
    this.open.set(true);
    this.arm();
    if (!wasOpen) {
      this.opened.emit();
    }
    afterNextRender(
      () => {
        // The mutation observer of Angular Aria sorts the new items in a microtask first.
        queueMicrotask(() => {
          this.focusEdge(focus);
        });
      },
      { injector: this.injector },
    );
  }

  private createOverlay(origin: HTMLElement | OverlayPoint): void {
    const overlay = this.overlays.connect(
      {
        origin,
        positions: isElement(origin) ? menuPositions(this.align()) : pointPositions(),
        layer: OVERLAY_LAYER.Menu,
      },
      { injector: this.injector },
    );
    this.overlay = overlay;
    this.overlayOrigin = origin;
    this.overlayAlign = this.align();
    overlay.attachElement(this.host);
    this.detachSubscription = overlay.detachments().subscribe(() => {
      if (this.overlay === overlay) {
        this.disposeOverlay();
        this.disarm();
        this.attached.set(false);
        if (this.open()) {
          // Detached from outside (not through `close()`): no listener may outlive the pane.
          this.open.set(false);
          this.anchorElement.set(null);
        }
      }
    });
  }

  private disposeOverlay(): void {
    this.detachSubscription?.unsubscribe();
    this.detachSubscription = null;
    const overlay = this.overlay;
    this.overlay = null;
    this.overlayOrigin = null;
    this.overlayAlign = null;
    overlay?.dispose();
  }

  /**
   * Moves focus to the first or last item through the Home / End keys of the Aria menu, so
   * its active item stays in step with the DOM focus. `@angular/aria` 22.2.5 has no public
   * `first()` / `last()` on `Menu` (only the private `_pattern`), and focusing the element
   * directly would leave Aria's active item behind. The spec asserts first/last focus, so an
   * Aria upgrade that changes this fails loudly.
   */
  private focusEdge(edge: MenuFocusEdge): void {
    if (!this.open()) {
      return;
    }
    this.host.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: edge === MENU_FOCUS_EDGE.First ? KEYBOARD_KEY.Home : KEYBOARD_KEY.End,
      }),
    );
  }

  private onItemSelected(): void {
    const item = this.items().find((candidate) => candidate.isActive());
    if (!item || item.disabled()) {
      return;
    }
    this.close();
    item.activate();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.inline()) {
      return;
    }
    if (event.key === KEYBOARD_KEY.Escape) {
      // A dialog around the trigger keeps its own Esc.
      event.stopPropagation();
      this.close();
    } else if (event.key === KEYBOARD_KEY.Tab) {
      // Focus returns to the trigger first, so Tab moves on from there.
      this.close();
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (this.inline() || !this.open() || !(next instanceof Node)) {
      return;
    }
    if (!this.host.contains(next)) {
      this.close({ restoreFocus: false });
    }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    const anchor = this.anchorElement();
    // A press on the trigger is its own click: it toggles the menu.
    if (this.host.contains(target) || anchor?.contains(target)) {
      return;
    }
    this.close({ restoreFocus: false });
  };

  private arm(): void {
    if (!this.listening) {
      this.listening = true;
      this.document.addEventListener('pointerdown', this.onPointerDown, true);
    }
  }

  private disarm(): void {
    if (this.listening) {
      this.listening = false;
      this.document.removeEventListener('pointerdown', this.onPointerDown, true);
    }
  }
}
