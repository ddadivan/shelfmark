import { aiAsk, aiSearch, aiSuggestions, aiSummaries } from '../support/whats-new-scenes';
import type { WhatsNewShot } from './whats-new-shot.interface';

/** The 2.2.0 New items, in their priority order (`changelog.const.ts`). */
export const WHATS_NEW_SHOTS: readonly WhatsNewShot[] = [
  { slug: 'ai-suggestions', prepare: aiSuggestions },
  { slug: 'ai-ask', prepare: aiAsk },
  { slug: 'ai-search', prepare: aiSearch },
  { slug: 'ai-summaries', prepare: aiSummaries },
];
