import { DragDrop } from '@angular/cdk/drag-drop';
import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  type TemplateRef,
  untracked,
  ViewContainerRef,
} from '@angular/core';
import type { TreeReorderPreviewContext } from './models/tree-reorder-preview-context.interface';
import { TREE_REORDER_TOUCH_DELAY_MS } from './models/tree-reorder-touch-delay.const';
import type { TreeReorderListDirective } from './tree-reorder-list.directive';

/**
 * A `ui-tree` row item (the `li`, so an open folder travels with its children) as a CDK drag
 * whose handle is the row itself: pressing a child row never drags its parent. The preview and
 * the drop slot come from templates of the tree. Internal to `ui-tree`.
 * Touch (#315): a drag starts after the finger rested `TREE_REORDER_TOUCH_DELAY_MS` and then
 * moves; CDK sets `touch-action: none` on a handle, which would stop a swipe on a row from
 * scrolling, so the handle gets `pan-y` back (CSSOM) and CDK cancels the scroll itself once a
 * drag has started.
 */
@Directive({ selector: '[uiTreeReorderItem]' })
export class TreeReorderItemDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly ref = inject(DragDrop).createDrag(this.element, {
    dragStartThreshold: 5,
    pointerDirectionChangeThreshold: 5,
  });
  /** The sibling list this row belongs to. */
  readonly list = input.required<TreeReorderListDirective>({ alias: 'uiTreeReorderItem' });
  readonly id = input.required<string>({ alias: 'uiTreeReorderItemId' });
  /** The row element: only a press on it starts a drag. */
  readonly handle = input.required<HTMLElement>({ alias: 'uiTreeReorderItemHandle' });
  readonly disabled = input(false, { alias: 'uiTreeReorderItemDisabled' });
  readonly context = input.required<TreeReorderPreviewContext>({
    alias: 'uiTreeReorderItemContext',
  });
  readonly preview = input.required<TemplateRef<TreeReorderPreviewContext>>({
    alias: 'uiTreeReorderItemPreview',
  });
  readonly placeholder = input.required<TemplateRef<TreeReorderPreviewContext>>({
    alias: 'uiTreeReorderItemPlaceholder',
  });

  constructor() {
    this.ref.lockAxis = 'y';
    this.ref.dragStartDelay = { touch: TREE_REORDER_TOUCH_DELAY_MS, mouse: 0 };
    effect(() => {
      this.ref.disabled = this.disabled();
      // Only draggable rows count as places of the list.
      this.list().sync();
      this.allowScroll(untracked(this.handle));
    });
    effect(() => {
      const handle = this.handle();
      this.ref.withHandles([handle]);
      this.allowScroll(handle);
    });
    effect(() => {
      const context = this.context();
      this.ref.withPreviewTemplate({
        template: this.preview(),
        viewContainer: this.viewContainer,
        context,
        matchSize: false,
      });
      this.ref.withPlaceholderTemplate({
        template: this.placeholder(),
        viewContainer: this.viewContainer,
        context,
      });
    });
    effect((onCleanup) => {
      const list = this.list();
      const entry = {
        id: () => this.id(),
        enabled: () => !this.disabled(),
        ref: this.ref,
        element: this.element,
      };
      list.register(entry);
      // The rows may have moved since the last render: CDK gets them in the order on screen.
      const sub = this.ref.beforeStarted.subscribe(() => list.sync());
      onCleanup(() => {
        sub.unsubscribe();
        list.unregister(entry);
      });
    });
    inject(DestroyRef).onDestroy(() => this.ref.dispose());
  }

  /** A swipe on the row scrolls the list; CDK prevents the scroll once a drag has started. */
  private allowScroll(handle: HTMLElement): void {
    handle.style.touchAction = 'pan-y';
  }
}
