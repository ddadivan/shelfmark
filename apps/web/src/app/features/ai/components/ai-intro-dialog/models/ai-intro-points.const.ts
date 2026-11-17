import type { AiIntroPoint } from './ai-intro-point.interface';

/** The four points of the AI intro, in the order of the AiIntro mockup. */
export const AI_INTRO_POINTS: readonly AiIntroPoint[] = [
  { icon: 'tag', key: 'ai.intro.suggest' },
  { icon: 'spark', key: 'ai.intro.summaries' },
  { icon: 'lock', key: 'ai.intro.sent' },
  { icon: 'info', key: 'ai.intro.training' },
];
