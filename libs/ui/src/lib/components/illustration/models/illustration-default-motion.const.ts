import type { IllustrationMotion } from './illustration-motion.type';
import type { IllustrationName } from './illustration-name.type';
import { ILLUSTRATION_MOTION } from './illustration-motion.const';

/** Motion a scene uses when the caller passes none: every scene loops (author decision, redesign v3). */
export const ILLUSTRATION_DEFAULT_MOTION: Readonly<Record<IllustrationName, IllustrationMotion>> = {
  'welcome-collect': ILLUSTRATION_MOTION.Loop,
  'welcome-save': ILLUSTRATION_MOTION.Loop,
  'welcome-find': ILLUSTRATION_MOTION.Loop,
  'empty-feed': ILLUSTRATION_MOTION.Loop,
  'empty-folder': ILLUSTRATION_MOTION.Loop,
  'not-found': ILLUSTRATION_MOTION.Loop,
  'page-not-found': ILLUSTRATION_MOTION.Loop,
  offline: ILLUSTRATION_MOTION.Loop,
  'empty-trash': ILLUSTRATION_MOTION.Loop,
  'empty-recent': ILLUSTRATION_MOTION.Loop,
  'empty-favorites': ILLUSTRATION_MOTION.Loop,
  'empty-unsorted': ILLUSTRATION_MOTION.Loop,
  'empty-tags': ILLUSTRATION_MOTION.Loop,
  'empty-filter': ILLUSTRATION_MOTION.Loop,
  error: ILLUSTRATION_MOTION.Loop,
  'signed-out': ILLUSTRATION_MOTION.Loop,
  'all-done': ILLUSTRATION_MOTION.Loop,
};
