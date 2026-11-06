import type { IllustrationMotion } from './illustration-motion.type';
import type { IllustrationName } from './illustration-name.type';
import { ILLUSTRATION_MOTION } from './illustration-motion.const';

/** Motion a scene uses when the caller passes none: loop for welcome, once for the rest. */
export const ILLUSTRATION_DEFAULT_MOTION: Readonly<Record<IllustrationName, IllustrationMotion>> = {
  'welcome-collect': ILLUSTRATION_MOTION.Loop,
  'welcome-save': ILLUSTRATION_MOTION.Loop,
  'welcome-find': ILLUSTRATION_MOTION.Loop,
  'empty-feed': ILLUSTRATION_MOTION.Once,
  'empty-folder': ILLUSTRATION_MOTION.Once,
  'not-found': ILLUSTRATION_MOTION.Once,
  'page-not-found': ILLUSTRATION_MOTION.Once,
  offline: ILLUSTRATION_MOTION.Once,
};
