import type { IllustrationMotion } from './illustration-motion.type';
import type { IllustrationName } from './illustration-name.type';

/** Motion a scene uses when the caller passes none: loop for welcome, once for the rest. */
export const ILLUSTRATION_DEFAULT_MOTION: Readonly<Record<IllustrationName, IllustrationMotion>> = {
  'welcome-collect': 'loop',
  'welcome-save': 'loop',
  'welcome-find': 'loop',
  'empty-feed': 'once',
  'empty-folder': 'once',
  'not-found': 'once',
  'page-not-found': 'once',
  offline: 'once',
};
