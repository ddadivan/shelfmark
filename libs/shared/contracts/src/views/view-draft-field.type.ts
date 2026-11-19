import type { VIEW_DRAFT_FIELD } from './view-draft-field.const';

/** One of `VIEW_DRAFT_FIELD`. */
export type ViewDraftField = (typeof VIEW_DRAFT_FIELD)[keyof typeof VIEW_DRAFT_FIELD];
