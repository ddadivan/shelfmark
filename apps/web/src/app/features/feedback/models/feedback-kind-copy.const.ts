import { FEEDBACK_MESSAGE_KIND, type FeedbackMessageKind } from '@shelfmark/contracts';
import type { FeedbackKindCopy } from './feedback-kind-copy.interface';

export const FEEDBACK_KIND_COPY: Record<FeedbackMessageKind, FeedbackKindCopy> = {
  [FEEDBACK_MESSAGE_KIND.Idea]: {
    labelKey: 'feedback.kind.idea',
    fieldKey: 'feedback.dialog.field.idea',
    placeholderKey: 'feedback.dialog.placeholder.idea',
  },
  [FEEDBACK_MESSAGE_KIND.Problem]: {
    labelKey: 'feedback.kind.problem',
    fieldKey: 'feedback.dialog.field.problem',
    placeholderKey: 'feedback.dialog.placeholder.problem',
  },
  [FEEDBACK_MESSAGE_KIND.Other]: {
    labelKey: 'feedback.kind.other',
    fieldKey: 'feedback.dialog.field.other',
    placeholderKey: 'feedback.dialog.placeholder.other',
  },
};
