import type { SegmentedOption } from '../../segmented-control/models/segmented-option.interface';

/** A one-of-few setting of `ui-view-menu` shown as a segmented control (the card image size). */
export interface ViewMenuChoice {
  /** Title above the control and its accessible name ("Preview image"). */
  readonly label: string;
  readonly options: readonly SegmentedOption[];
  /** The `value` of the chosen option. */
  readonly value: string;
}
