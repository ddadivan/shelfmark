import type { LandingAiPoint } from './landing-ai-point.interface';

/** The three AI features the block lists (LandingAi mockup), in this order. */
export const LANDING_AI_POINTS: readonly LandingAiPoint[] = [
  { id: 'suggest', icon: 'tag' },
  { id: 'meaning', icon: 'search' },
  { id: 'ask', icon: 'message' },
];
