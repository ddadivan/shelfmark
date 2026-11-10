import type { IconName } from '../../icon/models/icon-name.type';

/** One destination of `ui-tab-bar`; `label` is already translated. */
export interface TabBarItem {
  /** Stable id, matched against the `active` input. */
  readonly id: string;
  /** Always visible under the icon. */
  readonly label: string;
  readonly icon: IconName;
  /** Route of the destination; without it the item is a button. */
  readonly href?: string;
}
