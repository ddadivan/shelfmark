import type { LandingPreviewCard } from './landing-preview-card.interface';

/**
 * The hero's "Read later" preview, static demo content: a video first, then three articles with
 * real-looking domains, one soft background tone each, saved this week, last week and a while
 * ago. "All" shows them from the first ("Articles" from the first article) as far as the panel
 * has room; the last article only comes in under "Articles".
 */
export const LANDING_PREVIEW_CARDS: readonly LandingPreviewCard[] = [
  { id: 'talk', host: 'youtube.com', daysAgo: 1, tone: 1, article: false },
  { id: 'grid', host: 'web.dev', daysAgo: 2, tone: 0, article: true },
  { id: 'design', host: 'vox.com', daysAgo: 8, tone: 1, article: true },
  { id: 'slow', host: 'wired.com', daysAgo: 21, tone: 2, article: true },
];
