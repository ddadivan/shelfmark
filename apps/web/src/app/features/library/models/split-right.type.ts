import type { SPLIT_RIGHT_KIND } from './split-right-kind.const';

/** The right half as `?split` names it, before it is checked against the folders and the left feed. */
export type SplitRight =
  | { readonly kind: typeof SPLIT_RIGHT_KIND.Closed }
  | { readonly kind: typeof SPLIT_RIGHT_KIND.Picker }
  | { readonly kind: typeof SPLIT_RIGHT_KIND.Unsorted }
  | { readonly kind: typeof SPLIT_RIGHT_KIND.Folder; readonly folderId: string };
