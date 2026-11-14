/**
 * Chapter starts of each promo recording in milliseconds (#330: the desktop and the phone video
 * show different scenes, so each has its own times). Mirrors `HOW_IT_WORKS_CHAPTERS`
 * (apps/web/src/app/features/how-it-works/models/how-it-works-chapters.const.ts; e2e code must
 * not import app code): the recorder holds the previous step until a chapter's start, so the
 * captions and the dialog's chapter buttons line up. Change both together.
 */
export const PROMO_CHAPTER_START_MS = {
  desktop: {
    Save: 0,
    Organise: 33_000,
    Many: 70_000,
    Find: 101_000,
    Safety: 130_000,
    Yours: 147_000,
    Share: 177_000,
  },
  phone: {
    Save: 0,
    Organise: 27_000,
    Many: 59_000,
    Find: 82_000,
    Safety: 102_000,
    Yours: 116_000,
    Share: 135_000,
  },
} as const;
