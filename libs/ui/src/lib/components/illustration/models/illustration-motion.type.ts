import type { ILLUSTRATION_MOTION } from './illustration-motion.const';

/**
 * How a scene moves: `loop` (the default of every scene), `once` (one move, then holds the end
 * frame) or `none` (the still drawing). Reduced motion always shows the still drawing.
 */
export type IllustrationMotion = (typeof ILLUSTRATION_MOTION)[keyof typeof ILLUSTRATION_MOTION];
