import type { LandingAiPoint } from './landing-ai-point.interface';

/** The three AI features the block lists (16-landing), in this order. */
export const LANDING_AI_POINTS: readonly LandingAiPoint[] = [
  { id: 'suggest', icon: 'check' },
  { id: 'meaning', icon: 'search' },
  { id: 'ask', icon: 'spark' },
];
