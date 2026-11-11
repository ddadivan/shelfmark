import type { HowItWorksChapter } from './how-it-works-chapter.interface';

/** Chapters of the promo video (HowItWorks.dc.html); #271 keeps the recording in this order. */
export const HOW_IT_WORKS_CHAPTERS: readonly HowItWorksChapter[] = [
  { id: 'save', titleKey: 'howItWorks.chapters.save', start: 0 },
  { id: 'organise', titleKey: 'howItWorks.chapters.organise', start: 18 },
  { id: 'find', titleKey: 'howItWorks.chapters.find', start: 41 },
];
