import { computed, Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { UI_FOCUS_TARGET } from '../focus-target/models/ui-focus-target.const';
import type { MenuComponent } from './menu.component';
import { KEYBOARD_KEY } from '../keyboard';
import { MENU_FOCUS_EDGE } from './models/menu-focus-edge.const';
import { BUTTON_HASPOPUP } from '../button/models/button-haspopup.const';

/**
 * Opens a `ui-menu` from a button (the trigger half of the ARIA menu button pattern). Put it on
 * a `<ui-button>`: it reaches the inner native button through `UI_FOCUS_TARGET`, so the
 * listeners, `aria-haspopup="menu"`, `aria-expanded` and `aria-controls` all sit on the element
 * that has focus. On any other host it uses the host element.
 *
 * It opens on click, Enter and Space (native for a button), ArrowDown (first item) and ArrowUp
 * (last item); a second click closes. Angular Aria's `MenuTrigger` writes its attributes on
 * its own host, which for `<ui-button>` is not the focusable element, so it cannot be used here;
 * the popup itself is still Aria's `ngMenu`. Do not also bind `ariaExpanded`, `ariaControls` or
 * `ariaHaspopup` on the `ui-button`.
 */
@Directive({
  selector: '[uiMenuTrigger]',
  exportAs: 'uiMenuTrigger',
})
export class MenuTriggerDirective {
  /** The menu to open. */
  readonly menu = input.required<MenuComponent>({ alias: 'uiMenuTrigger' });

  private readonly focusTarget = inject(UI_FOCUS_TARGET, { optional: true, self: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);

  private readonly target = computed(() =>
    this.focusTarget ? this.focusTarget.element() : this.host,
  );

  constructor() {
    effect((onCleanup) => {
      const target = this.target();
      if (!target) {
        return;
      }
      const unlisten = [
        this.renderer.listen(target, 'click', (event: MouseEvent) => {
          // A link trigger must not navigate.
          if (target.tagName === 'A') {
            event.preventDefault();
          }
          this.toggle(target);
        }),
        this.renderer.listen(target, 'keydown', (event: KeyboardEvent) => {
          this.onKeydown(event, target);
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
      if (!target) {
        return;
      }
      const menu = this.menu();
      this.renderer.setAttribute(target, 'aria-haspopup', BUTTON_HASPOPUP.Menu);
      this.renderer.setAttribute(target, 'aria-expanded', String(menu.anchor() === target));
      this.renderer.setAttribute(target, 'aria-controls', menu.id());
      onCleanup(() => {
        this.renderer.removeAttribute(target, 'aria-haspopup');
        this.renderer.removeAttribute(target, 'aria-expanded');
        this.renderer.removeAttribute(target, 'aria-controls');
      });
    });
  }

  private toggle(target: HTMLElement): void {
    const menu = this.menu();
    if (menu.anchor() === target) {
      menu.close();
    } else {
      menu.openFrom(target, { focus: MENU_FOCUS_EDGE.First });
    }
  }

  private onKeydown(event: KeyboardEvent, target: HTMLElement): void {
    const menu = this.menu();
    if (event.key === KEYBOARD_KEY.ArrowDown || event.key === KEYBOARD_KEY.ArrowUp) {
      event.preventDefault();
      menu.openFrom(target, {
        focus: event.key === KEYBOARD_KEY.ArrowDown ? MENU_FOCUS_EDGE.First : MENU_FOCUS_EDGE.Last,
      });
    } else if (
      (event.key === KEYBOARD_KEY.Enter || event.key === KEYBOARD_KEY.Space) &&
      !this.isNativeButton(target)
    ) {
      event.preventDefault();
      this.toggle(target);
    }
  }

  /** Buttons and links click on Enter / Space themselves. */
  private isNativeButton(target: HTMLElement): boolean {
    return target.tagName === 'BUTTON' || target.tagName === 'A';
  }
}
