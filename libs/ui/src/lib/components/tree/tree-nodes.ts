import type { TreeRowPlace } from './models/tree-row-place.interface';
import type { UiTreeNode } from './models/tree-node.interface';

/** Calls `visit` for every row of `lists` (nested by `children`), parents before children. */
function walk(
  lists: readonly (readonly UiTreeNode[])[],
  visit: (node: UiTreeNode, place: TreeRowPlace) => void,
): void {
  const branch = (list: readonly UiTreeNode[], parent: string | null): void => {
    list.forEach((node, index) => {
      visit(node, { parent, previous: list[index - 1]?.id ?? null });
      branch(node.children ?? [], node.id);
    });
  };
  for (const list of lists) {
    branch(list, null);
  }
}

/** Every row of `lists` by its id. */
export function indexTreeNodes(
  ...lists: readonly (readonly UiTreeNode[])[]
): Map<string, UiTreeNode> {
  const byId = new Map<string, UiTreeNode>();
  walk(lists, (node) => byId.set(node.id, node));
  return byId;
}

/** Where every row of `lists` sits: its parent and the sibling before it. */
export function treeRowPlaces(
  ...lists: readonly (readonly UiTreeNode[])[]
): Map<string, TreeRowPlace> {
  const places = new Map<string, TreeRowPlace>();
  walk(lists, (node, place) => places.set(node.id, place));
  return places;
}

/** Ids of the parents of `id` in `places`, nearest first (a cycle ends the chain). */
export function treeAncestors(id: string, places: ReadonlyMap<string, TreeRowPlace>): string[] {
  const chain: string[] = [];
  let parent = places.get(id)?.parent;
  while (parent && !chain.includes(parent)) {
    chain.push(parent);
    parent = places.get(parent)?.parent;
  }
  return chain;
}
