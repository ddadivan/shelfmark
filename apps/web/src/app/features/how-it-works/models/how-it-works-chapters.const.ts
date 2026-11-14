import type { HowItWorksChapter } from './how-it-works-chapter.interface';

/**
 * Chapters of the promo videos (HowItWorks.dc.html; seven since #330, every feature): the
 * recorder keeps each recording in this order and holds each chapter until its start
 * (`PROMO_CHAPTER_START_MS`, one set of times per recording).
 */
export const HOW_IT_WORKS_CHAPTERS: readonly HowItWorksChapter[] = [
  { id: 'save', titleKey: 'howItWorks.chapters.save', desktop: 0, phone: 0 },
  { id: 'organise', titleKey: 'howItWorks.chapters.organise', desktop: 33, phone: 27 },
  { id: 'many', titleKey: 'howItWorks.chapters.many', desktop: 70, phone: 59 },
  { id: 'find', titleKey: 'howItWorks.chapters.find', desktop: 101, phone: 82 },
  { id: 'safety', titleKey: 'howItWorks.chapters.safety', desktop: 130, phone: 102 },
  { id: 'yours', titleKey: 'howItWorks.chapters.yours', desktop: 147, phone: 116 },
  { id: 'share', titleKey: 'howItWorks.chapters.share', desktop: 177, phone: 135 },
];
