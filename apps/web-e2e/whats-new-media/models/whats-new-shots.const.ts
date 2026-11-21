import { linkPreview } from '../support/whats-new-scenes';
import type { WhatsNewShot } from './whats-new-shot.interface';

/** The 2.5.0 New items, in their priority order (`changelog.const.ts`). */
export const WHATS_NEW_SHOTS: readonly WhatsNewShot[] = [
  { slug: 'link-preview', prepare: linkPreview },
];
