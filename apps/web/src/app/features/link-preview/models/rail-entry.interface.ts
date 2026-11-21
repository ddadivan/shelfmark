import type { IconName } from '@shelfmark/ui';

/** One fixed entry of the preview's icon rail (#553). */
export interface RailEntry {
  readonly path: string;
  readonly icon: IconName;
  readonly labelKey: string;
}
