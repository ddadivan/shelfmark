/** Global classes of the drop motion (Motion «Drop a link on a folder», #562; `styles.scss`). */
export const DROP_MOTION_CLASS = {
  /** On the drag preview root: the CDK takes it back with `ease-in-out` while it flies. */
  Flying: 'library__drag-preview--flying',
  /** On the folder row, tile or half the links land on. */
  Bump: 'library__drop-bump',
} as const;
