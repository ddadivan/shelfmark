/**
 * Chapter starts of the promo video in milliseconds. Mirrors `HOW_IT_WORKS_CHAPTERS`
 * (apps/web/src/app/features/how-it-works/models/how-it-works-chapters.const.ts; e2e code must
 * not import app code): the recorder holds the previous step until a chapter's start, so the
 * captions and the dialog's chapter buttons line up. Change both together.
 */
export const PROMO_CHAPTER_START_MS = {
  Save: 0,
  Organise: 18_000,
  Find: 41_000,
} as const;
