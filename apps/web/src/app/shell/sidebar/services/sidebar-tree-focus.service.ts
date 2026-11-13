import { afterNextRender, inject, Injector, Service } from '@angular/core';
import type { TreeComponent } from '@shelfmark/ui';

/**
 * The folder trees currently on screen (the desktop sidebar, the phone drawer), so a feature can
 * give focus back to a row after a dialog closed on a row that no longer exists (a folder that
 * moved under a collapsed parent).
 */
@Service()
export class SidebarTreeFocusService {
  private readonly trees = new Set<TreeComponent>();
  private readonly injector = inject(Injector);

  /** Called by the sidebar; the returned function unregisters the tree. */
  register(tree: TreeComponent): () => void {
    this.trees.add(tree);
    return () => this.trees.delete(tree);
  }

  /** Focuses the row `id`, or the nearest visible row (see `TreeComponent.restoreFocusNear`). */
  restoreFocusNear(id: string): void {
    for (const tree of this.trees) {
      if (tree.restoreFocusNear(id) !== null) {
        return;
      }
    }
  }

  /**
   * Focuses the row `id` of a folder just created, once the tree has rendered it (scrolled into
   * view by the focus). Tries again after the next render when the row is not there yet. Does
   * nothing when no tree on screen shows it (the mobile shell pages without a sidebar).
   */
  focusCreated(id: string): void {
    const attempt = (retry: boolean): void => {
      for (const tree of this.trees) {
        if (tree.focusRow(id)) {
          return;
        }
      }
      if (retry) {
        afterNextRender(() => attempt(false), { injector: this.injector });
      }
    };
    afterNextRender(() => attempt(true), { injector: this.injector });
  }
}
