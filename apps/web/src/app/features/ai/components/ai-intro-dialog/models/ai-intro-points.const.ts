import type { AiIntroPoint } from './ai-intro-point.interface';

/** The points of the AI intro, in the order of the AiIntro mockup; search by meaning since AI-3, Ask since AI-4. */
export const AI_INTRO_POINTS: readonly AiIntroPoint[] = [
  { icon: 'tag', key: 'ai.intro.suggest' },
  { icon: 'spark', key: 'ai.intro.summaries' },
  { icon: 'search', key: 'ai.intro.meaning' },
  { icon: 'message', key: 'ai.intro.ask' },
  { icon: 'lock', key: 'ai.intro.sent' },
  { icon: 'info', key: 'ai.intro.training' },
];
