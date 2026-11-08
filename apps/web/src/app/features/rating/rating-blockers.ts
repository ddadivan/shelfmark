const MODAL_SELECTOR = '.cdk-dialog-container, [aria-modal="true"]';
const EDITABLE_SELECTOR =
  'input:not([type="button"], [type="checkbox"], [type="radio"], [type="submit"]), textarea, select, [contenteditable]:not([contenteditable="false"])';

/** Something is in the way of an unasked-for dialog: a modal, an editing field or a hidden tab. */
export function isRatingBlocked(doc: Document): boolean {
  if (doc.visibilityState === 'hidden') {
    return true;
  }
  if (doc.querySelector(MODAL_SELECTOR)) {
    return true;
  }
  // A focused text field stands in for an unsaved form (there is no page form registry).
  return doc.activeElement?.matches(EDITABLE_SELECTOR) ?? false;
}

/** The key event comes from a text field, where digits and arrows belong to the field. */
export function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.matches(EDITABLE_SELECTOR);
}
