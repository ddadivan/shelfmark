import type { FeedbackMessageKind } from '@shelfmark/contracts';

/** The fields of the feedback form (the screenshot is kept apart: it is not a text field). */
export interface FeedbackFormModel {
  kind: FeedbackMessageKind;
  text: string;
  /** "Attach browser and app version". */
  attachClient: boolean;
}
