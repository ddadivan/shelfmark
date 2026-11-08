import { Service } from '@angular/core';
import type { TreeComponent } from '@shelfmark/ui';

/**
 * The folder trees currently on screen (the desktop sidebar, the phone drawer), so a feature can
 * give focus back to a row after a dialog closed on a row that no longer exists (a folder that
 * moved under a collapsed parent).
 */
@Service()
export class SidebarTreeFocusService {
  private readonly trees = new Set<TreeComponent>();

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
}
