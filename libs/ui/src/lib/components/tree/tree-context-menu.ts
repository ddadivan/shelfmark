import { DestroyRef, inject } from '@angular/core';
import type { ButtonComponent } from '../button/button.component';
import type { UiLongPressEvent } from '../../directives/long-press/models/long-press-event.interface';
import { UI_TREE_CONTEXT_MENU_TRIGGER } from './models/tree-context-menu-trigger.const';
import type { UiTreeContextMenuEvent } from './models/tree-context-menu-event.interface';
import type { UiTreeNode } from './models/tree-node.interface';
import { isEchoedMenuKey, isMenuKey } from './tree-keys';

/** Safety net: a pending keyboard echo is dropped after this long (a held key refreshes it). */
const KEYBOARD_ECHO_TIMEOUT_MS = 1000;
/** The echo can arrive just after the key is released. */
const KEYBOARD_ECHO_RELEASE_MS = 100;

/**
 * The folder menu half of `ui-tree`: turns a right click, a long press, the "..." button and the
 * menu keys of a folder row into one `contextMenu` request. A key that the browser echoes as a
 * `contextmenu` event (the context-menu key, Shift+F10) arms a one-shot flag, so the echo is
 * swallowed instead of asking twice; the flag clears on the first echo, shortly after the key is
 * released, on blur, or after a safety timeout. Create it in the component's injection context.
 */
export class TreeContextMenu {
  /** A folder row is being dragged (pointer or touch): long press and `contextmenu` stay quiet. */
  dragging = false;
  /** A keyboard menu request is pending; the browser's echoed `contextmenu` consumes it. */
  private echo = false;
  private echoTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly emit: (event: UiTreeContextMenuEvent) => void) {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.echoTimer));
  }

  /** The "..." button of a folder row: the menu opens from the button. */
  fromButton(event: Event, node: UiTreeNode, button: ButtonComponent): void {
    // Not a row click: the Aria handler would choose the row and toggle it.
    event.stopPropagation();
    const anchor = button.element();
    if (anchor) {
      this.emit({ node, trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Button, anchor, position: null });
    }
  }

  /** Touch route to the folder menu: iOS Safari fires no `contextmenu`, so a long press opens it. */
  fromLongPress(event: UiLongPressEvent, node: UiTreeNode, row: HTMLElement): void {
    // A touch drag started inside the long-press tolerance: the finger is moving a row, no menu.
    if (this.dragging) {
      return;
    }
    this.emit({
      node,
      trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Pointer,
      anchor: row,
      position: { x: event.x, y: event.y },
    });
  }

  /** A right click, or the browser's `contextmenu` after a key (at 0, 0 it is the keyboard). */
  fromContextMenu(event: MouseEvent, node: UiTreeNode, row: HTMLElement): void {
    event.preventDefault();
    // Android's own long-press `contextmenu` can arrive while a row is being dragged.
    if (this.dragging) {
      return;
    }
    if (this.echo) {
      // The echo of the key press that already emitted: not a pointer request.
      this.disarm();
      return;
    }
    const keyboard = event.clientX === 0 && event.clientY === 0;
    this.emit({
      node,
      trigger: keyboard
        ? UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard
        : UI_TREE_CONTEXT_MENU_TRIGGER.Pointer,
      anchor: row,
      position: keyboard ? null : { x: event.clientX, y: event.clientY },
    });
  }

  /**
   * The context-menu key, Shift+F10 or Alt+Enter on a folder row asks for its menu (once for a
   * held key). Returns `false` for any other key, which the caller handles.
   */
  fromKey(event: KeyboardEvent, node: UiTreeNode, row: HTMLElement): boolean {
    if (!isMenuKey(event)) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    // A held key repeats: one request, but the echo (context-menu key, Shift+F10) stays expected.
    if (!event.repeat) {
      this.emit({
        node,
        trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard,
        anchor: row,
        position: null,
      });
    }
    if (isEchoedMenuKey(event)) {
      this.echo = true;
      this.scheduleDisarm(KEYBOARD_ECHO_TIMEOUT_MS);
    }
    return true;
  }

  /** A key was released on the row: a pending echo may still arrive right after. */
  release(): void {
    if (this.echo) {
      this.scheduleDisarm(KEYBOARD_ECHO_RELEASE_MS);
    }
  }

  /** No echo is expected any more. */
  disarm(): void {
    clearTimeout(this.echoTimer);
    this.echo = false;
  }

  private scheduleDisarm(delay: number): void {
    clearTimeout(this.echoTimer);
    this.echoTimer = setTimeout(() => this.disarm(), delay);
  }
}
