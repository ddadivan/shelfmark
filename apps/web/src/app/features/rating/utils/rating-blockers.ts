import { isTypingTarget } from '../../../core/layout/utils/is-typing-target';

const MODAL_SELECTOR = '.cdk-dialog-container, [aria-modal="true"]';

/** Something is in the way of an unasked-for dialog: a modal, an editing field or a hidden tab. */
export function isRatingBlocked(doc: Document): boolean {
  if (doc.visibilityState === 'hidden') {
    return true;
  }
  if (doc.querySelector(MODAL_SELECTOR)) {
    return true;
  }
  // A focused text field stands in for an unsaved form (there is no page form registry).
  return isTypingTarget(doc.activeElement);
}
