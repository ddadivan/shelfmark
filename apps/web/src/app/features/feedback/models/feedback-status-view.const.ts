import { FEEDBACK_STATUS, type FeedbackStatus } from '@shelfmark/contracts';
import { CHIP_VARIANT } from '@shelfmark/ui';
import type { FeedbackStatusView } from './feedback-status-view.interface';

/** Received and Not planned are neutral; Planned, In progress and Done are accent (Done with a check). */
export const FEEDBACK_STATUS_VIEW: Record<FeedbackStatus, FeedbackStatusView> = {
  [FEEDBACK_STATUS.Received]: {
    labelKey: 'feedback.status.received',
    variant: CHIP_VARIANT.Neutral,
  },
  [FEEDBACK_STATUS.Planned]: { labelKey: 'feedback.status.planned', variant: CHIP_VARIANT.Tag },
  [FEEDBACK_STATUS.InProgress]: {
    labelKey: 'feedback.status.inProgress',
    variant: CHIP_VARIANT.Tag,
  },
  [FEEDBACK_STATUS.Done]: {
    labelKey: 'feedback.status.done',
    variant: CHIP_VARIANT.Tag,
    icon: 'check',
  },
  [FEEDBACK_STATUS.NotPlanned]: {
    labelKey: 'feedback.status.notPlanned',
    variant: CHIP_VARIANT.Neutral,
  },
};
