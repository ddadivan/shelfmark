import type { LandingPreviewCard } from './landing-preview-card.interface';

/**
 * The three articles of the hero's "Read later" preview, static demo content: real-looking
 * domains, one soft background tone each, saved this week, last week and a while ago.
 */
export const LANDING_PREVIEW_CARDS: readonly LandingPreviewCard[] = [
  { id: 'grid', host: 'web.dev', daysAgo: 2, tone: 0 },
  { id: 'design', host: 'vox.com', daysAgo: 8, tone: 1 },
  { id: 'slow', host: 'wired.com', daysAgo: 21, tone: 2 },
];
