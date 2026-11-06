import { ComponentPortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  computed,
  type ComponentRef,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  numberAttribute,
  Renderer2,
  untracked,
} from '@angular/core';
import { UI_FOCUS_TARGET } from '../focus-target/models/ui-focus-target.const';
import type { ConnectedOverlay } from '../overlay/connected-overlay';
import { UiOverlay } from '../overlay/overlay.service';
import { sidePositions } from '../overlay/side-positions';
import type { TooltipPosition } from './models/tooltip-position.type';
import { TooltipPanelComponent } from './tooltip-panel.component';
import { KEYBOARD_KEY } from '../keyboard';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';
import { OVERLAY_SIDE } from '../overlay/models/overlay-side.const';

/** Time the pointer or focus may leave before the tooltip closes (lets it reach the panel). */
const HIDE_GRACE_MS = 100;
let nextId = 0;

function textTransform(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * Names an icon-only control or shows its shortcut (docs/design/components/Tooltip/README.md).
 * Appears after `delay` (400 ms) on hover and on keyboard focus, closes on blur, pointer leave
 * and Esc (focus stays where it is), and stays open while the pointer is over it (WCAG 1.4.13).
 * It never opens on devices without hover (`(hover: none)`).
 *
 * On `<ui-button>` the directive reaches the inner native element through `UI_FOCUS_TARGET`
 * (listeners, anchor, `aria-describedby`); on any other host it uses the host element. The
 * description is a visually hidden element in `<body>` that `aria-describedby` points at (the
 * tooltip itself is `aria-hidden`). `aria-describedby` is merged with an existing value; do not
 * also bind `ariaDescribedby` on a `ui-button` that has a tooltip.
 */
@Directive({
  selector: '[uiTooltip]',
  exportAs: 'uiTooltip',
})
export class TooltipDirective {
  /** The tooltip text. Empty or missing: no tooltip. */
  readonly text = input('', { alias: 'uiTooltip', transform: textTransform });
  readonly position = input<TooltipPosition>(OVERLAY_SIDE.Top);
  /** Milliseconds before the tooltip opens on hover or focus. */
  readonly delay = input(400, { transform: numberAttribute });
  /** Shortcut shown as `kbd` after the text, for example `⌘K`. */
  readonly shortcut = input('', { alias: 'uiTooltipShortcut', transform: textTransform });

  private readonly focusTarget = inject(UI_FOCUS_TARGET, { optional: true, self: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly overlays = inject(UiOverlay);
  private readonly injector = inject(Injector);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  /** The element that gets listeners, `aria-describedby` and the anchor. */
  private readonly target = computed(() =>
    this.focusTarget ? this.focusTarget.element() : this.host,
  );

  private readonly descriptionId = `ui-tooltip-${nextId++}`;
  private description: HTMLElement | null = null;
  private overlay: ConnectedOverlay | null = null;
  private panel: ComponentRef<TooltipPanelComponent> | null = null;
  private showTimer: ReturnType<typeof setTimeout> | undefined;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  private hovered = false;
  private focused = false;
  private overPanel = false;
  private dismissed = false;
  private visible = false;
  private escapeArmed = false;
  private side: TooltipPosition = OVERLAY_SIDE.Top;

  constructor() {
    effect((onCleanup) => {
      const target = this.target();
      if (!target) {
        return;
      }
      const unlisten = [
        this.renderer.listen(target, 'pointerenter', (event: PointerEvent) => {
          this.onPointerEnter(event);
        }),
        this.renderer.listen(target, 'pointerleave', () => {
          this.onPointerLeave();
        }),
        this.renderer.listen(target, 'focus', () => {
          this.onFocus(target);
        }),
        this.renderer.listen(target, 'blur', () => {
          this.onBlur();
        }),
        // Activating the control dismisses the tooltip, like Esc.
        this.renderer.listen(target, 'click', () => {
          this.dismiss();
        }),
      ];
      onCleanup(() => {
        unlisten.forEach((fn) => {
          fn();
        });
      });
    });

    effect((onCleanup) => {
      const target = this.target();
      this.syncDescription();
      if (target) {
        onCleanup(() => {
          this.removeDescribedBy(target);
        });
      }
    });

    // A different position needs different CDK positions: rebuild lazily on the next open.
    effect(() => {
      this.position();
      untracked(() => {
        this.resetOverlay();
      });
    });

    // Text and shortcut changes reach an open tooltip.
    effect(() => {
      const text = this.text();
      const shortcut = this.shortcut();
      untracked(() => {
        if (!text) {
          this.hide();
        }
        if (this.panel && this.overlay?.isAttached) {
          this.panel.setInput('text', text);
          this.panel.setInput('shortcut', shortcut);
          this.remeasure();
        }
      });
    });

    inject(DestroyRef).onDestroy(() => {
      this.clearTimers();
      this.disarmEscape();
      this.resetOverlay();
      this.removeDescription();
    });
  }

  private onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.hovered = true;
    this.requestShow();
  }

  private onPointerLeave(): void {
    this.hovered = false;
    if (!this.focused) {
      this.dismissed = false;
    }
    this.requestHide();
  }

  private onFocus(target: HTMLElement): void {
    if (!this.isKeyboardFocus(target)) {
      return;
    }
    this.focused = true;
    this.requestShow();
  }

  private onBlur(): void {
    this.focused = false;
    this.dismissed = false;
    this.requestHide();
  }

  private onPanelHover(over: boolean): void {
    this.overPanel = over;
    if (over) {
      clearTimeout(this.hideTimer);
    } else {
      this.requestHide();
    }
  }

  private readonly onEscape = (event: KeyboardEvent): void => {
    if (event.key !== KEYBOARD_KEY.Escape) {
      return;
    }
    if (!this.visible) {
      // Not open yet: cancel the pending show and let Esc reach a dialog or menu.
      if (this.showTimer !== undefined) {
        this.dismiss();
      }
      return;
    }
    // Only the tooltip closes; a dialog or menu around the trigger keeps its own Esc.
    event.stopPropagation();
    this.dismiss();
  };

  /** Esc or activation: closes now and stays closed until the pointer or focus leaves. */
  private dismiss(): void {
    this.dismissed = true;
    this.hide();
  }

  private requestShow(): void {
    clearTimeout(this.hideTimer);
    if (this.visible || this.dismissed || this.showTimer !== undefined) {
      return;
    }
    this.armEscape();
    this.showTimer = setTimeout(() => {
      this.showTimer = undefined;
      this.show();
    }, this.delay());
  }

  private requestHide(): void {
    clearTimeout(this.hideTimer);
    if (this.hovered || this.focused || this.overPanel) {
      return;
    }
    clearTimeout(this.showTimer);
    this.showTimer = undefined;
    if (!this.visible) {
      this.disarmEscape();
      return;
    }
    this.hideTimer = setTimeout(() => {
      this.hide();
    }, HIDE_GRACE_MS);
  }

  private show(): void {
    const target = this.target();
    if (!target || !this.text() || this.visible || !this.canHover()) {
      this.disarmEscape();
      return;
    }
    this.syncDescription();
    const overlay = this.overlay ?? this.createOverlay(target);
    this.visible = true;
    if (this.panel && overlay.isAttached) {
      overlay.cancelRelease();
      this.panel.setInput('open', true);
      return;
    }
    const panel = overlay.attach(new ComponentPortal(TooltipPanelComponent));
    this.side = this.position();
    panel.setInput('side', this.side);
    panel.setInput('text', this.text());
    panel.setInput('shortcut', this.shortcut());
    panel.setInput('open', true);
    panel.instance.hovered.subscribe((over) => {
      this.onPanelHover(over);
    });
    this.panel = panel;
  }

  private hide(): void {
    this.clearTimers();
    this.disarmEscape();
    this.overPanel = false;
    if (!this.visible) {
      return;
    }
    this.visible = false;
    this.panel?.setInput('open', false);
    this.overlay?.release();
  }

  private createOverlay(target: HTMLElement): ConnectedOverlay {
    this.overlay = this.overlays.connect(
      { origin: target, positions: sidePositions(this.position()), layer: OVERLAY_LAYER.Tooltip },
      {
        injector: this.injector,
        onPositionChange: (side) => {
          if (this.panel && this.overlay?.isAttached && side !== this.side) {
            this.side = side;
            this.panel.setInput('side', side);
            // The gap moved to another edge: measure again after the panel has rendered.
            this.remeasure();
          }
        },
      },
    );
    return this.overlay;
  }

  private resetOverlay(): void {
    this.visible = false;
    this.clearTimers();
    this.panel = null;
    this.overlay?.dispose();
    this.overlay = null;
  }

  private clearTimers(): void {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);
    this.showTimer = undefined;
    this.hideTimer = undefined;
  }

  private armEscape(): void {
    if (!this.escapeArmed) {
      this.escapeArmed = true;
      this.document.addEventListener('keydown', this.onEscape, true);
    }
  }

  private disarmEscape(): void {
    if (this.escapeArmed) {
      this.escapeArmed = false;
      this.document.removeEventListener('keydown', this.onEscape, true);
    }
  }

  /** No tooltip on devices without hover (touch only): it would never go away. */
  private canHover(): boolean {
    return !(this.document.defaultView?.matchMedia?.('(hover: none)').matches ?? false);
  }

  /** Mouse focus on a button is not `:focus-visible`; hover covers it. */
  private isKeyboardFocus(target: HTMLElement): boolean {
    try {
      return target.matches(':focus-visible');
    } catch {
      return true;
    }
  }

  /**
   * Keeps the hidden description and `aria-describedby` in line with text, shortcut and the
   * target's accessible name. Runs in an effect and again when the tooltip opens, so a later
   * `aria-label` change is picked up too.
   */
  private syncDescription(): void {
    const target = this.target();
    const text = this.text();
    const shortcut = this.shortcut();
    if (!target) {
      return;
    }
    // An icon-only button already has this name: describing it again is announced twice.
    if (!text || (!shortcut && target.getAttribute('aria-label')?.trim() === text.trim())) {
      this.removeDescribedBy(target);
      this.removeDescription();
      return;
    }
    this.ensureDescription().textContent = shortcut ? `${text} (${shortcut})` : text;
    this.addDescribedBy(target);
  }

  /** Measure again once the panel has rendered its new content (not inside the CDK emit). */
  private remeasure(): void {
    afterNextRender(
      () => {
        if (this.overlay?.isAttached) {
          this.overlay.updatePosition();
        }
      },
      { injector: this.injector },
    );
  }

  private removeDescription(): void {
    this.description?.remove();
    this.description = null;
  }

  private ensureDescription(): HTMLElement {
    if (!this.description) {
      const element = this.document.createElement('span');
      element.id = this.descriptionId;
      element.className = 'ui-tooltip-description';
      this.document.body.append(element);
      this.description = element;
    }
    return this.description;
  }

  private addDescribedBy(target: HTMLElement): void {
    const ids = this.describedByIds(target);
    if (!ids.includes(this.descriptionId)) {
      target.setAttribute('aria-describedby', [...ids, this.descriptionId].join(' '));
    }
  }

  private removeDescribedBy(target: HTMLElement): void {
    const ids = this.describedByIds(target).filter((id) => id !== this.descriptionId);
    if (ids.length > 0) {
      target.setAttribute('aria-describedby', ids.join(' '));
    } else {
      target.removeAttribute('aria-describedby');
    }
  }

  private describedByIds(target: HTMLElement): string[] {
    return (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  }
}
