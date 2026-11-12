import type { HowItWorksChapter } from './how-it-works-chapter.interface';

/**
 * Chapters of the promo video (HowItWorks.dc.html, five since #315); the recorder keeps the
 * recording in this order and holds each chapter until its start (`PROMO_CHAPTER_START_MS`).
 */
export const HOW_IT_WORKS_CHAPTERS: readonly HowItWorksChapter[] = [
  { id: 'save', titleKey: 'howItWorks.chapters.save', start: 0 },
  { id: 'organise', titleKey: 'howItWorks.chapters.organise', start: 34 },
  { id: 'find', titleKey: 'howItWorks.chapters.find', start: 52 },
  { id: 'many', titleKey: 'howItWorks.chapters.many', start: 79 },
  { id: 'yours', titleKey: 'howItWorks.chapters.yours', start: 99 },
];
