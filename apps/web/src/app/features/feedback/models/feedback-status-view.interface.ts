import type { ChipVariant, IconName } from '@shelfmark/ui';

/** How a feedback status looks: its label and its tone (`tag` is the accent, `neutral` the quiet one). */
export interface FeedbackStatusView {
  labelKey: string;
  variant: ChipVariant;
  icon?: IconName;
}
