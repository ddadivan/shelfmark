/** What lies under the pointer during a link drag: the folder, how it was found and its element. */
export interface DropLocation {
  /** Folder id, `null` for Unsorted, `undefined` for no target. */
  readonly target: string | null | undefined;
  /** Found through a half of the side-by-side view. */
  readonly half: boolean;
  /** The tile, half or tree row under the pointer, `null` when there is none. */
  readonly element: Element | null;
}
