import type { IconName } from '../../icon/models/icon-name.type';

/** One choice of `ui-segmented-control`; `label` is already translated. */
export interface SegmentedOption {
  readonly value: string;
  /** Visible text, or the accessible name (and tooltip) when the control is `iconOnly`. */
  readonly label: string;
  readonly icon?: IconName;
  readonly disabled?: boolean;
}
